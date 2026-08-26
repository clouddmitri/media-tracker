import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { setAcceptingTraffic } from "./routes/health.js";
import { pool } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { getErrorMessage } from "./lib/errors.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${String(env.PORT)}`);
});

const SHUTDOWN_TIMEOUT_MS = 10000;
const DRAIN_DELAY_MS = env.NODE_ENV === "production" ? 5000 : 0;

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    setAcceptingTraffic(false);
    console.log("Readiness set to draining");

    if (DRAIN_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, DRAIN_DELAY_MS));
    }

    await new Promise<void>((resolve) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close((err) => {
        if (err) console.error("Error closing server:", getErrorMessage(err));
        resolve();
      });
    });
    console.log("HTTP server closed");

    await pool.end();
    console.log("Postgres pool closed");

    redis.disconnect();
    console.log("Redis disconnected");

    clearTimeout(forceExit);
    console.log("Shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", getErrorMessage(err));
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  void shutdown("unhandledRejection");
});

export { server };
