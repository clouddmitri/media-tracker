import { Router } from "express";
import { pool } from "../lib/db.js";
import { redis } from "../lib/redis.js";
import { getErrorMessage } from "../lib/errors.js";

export const healthRouter: Router = Router();

let acceptingTraffic = true;

export function setAcceptingTraffic(value: boolean): void {
  acceptingTraffic = value;
}

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => {
        reject(new Error(`check timed out after ${String(ms)}ms`));
      }, ms),
    ),
  ]);
}

type CheckResult = { status: "up" } | { status: "down"; error: string };

async function checkPostgres(): Promise<CheckResult> {
  try {
    await withTimeout(pool.query("SELECT 1"), CHECK_TIMEOUT_MS);
    return { status: "up" };
  } catch (err) {
    return { status: "down", error: getErrorMessage(err) };
  }
}

async function checkRedis(): Promise<CheckResult> {
  try {
    await withTimeout(redis.ping(), CHECK_TIMEOUT_MS);
    return { status: "up" };
  } catch (err) {
    return { status: "down", error: getErrorMessage(err) };
  }
}

healthRouter.get("/live", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

healthRouter.get("/ready", async (_req, res) => {
  if (!acceptingTraffic) {
    res.status(503).json({ status: "shutting_down" });
    return;
  }

  const [postgres, redisResult] = await Promise.all([checkPostgres(), checkRedis()]);

  const healthy = postgres.status === "up" && redisResult.status === "up";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks: { postgres, redis: redisResult },
  });
});
