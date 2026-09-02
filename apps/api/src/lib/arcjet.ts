import arcjet, { shield, slidingWindow, tokenBucket, validateEmail } from "@arcjet/node";
import { env } from "../config/env.js";

const mode = env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN";

export const ajShield = arcjet({
  key: env.ARCJET_KEY,
  rules: [shield({ mode })],
});

export const ajAuth = arcjet({
  key: env.ARCJET_KEY,
  characteristics: ["ip.src"],
  rules: [shield({ mode }), slidingWindow({ mode, interval: "15m", max: 10 })],
});

export const ajRegister = arcjet({
  key: env.ARCJET_KEY,
  characteristics: ["ip.src"],
  rules: [
    shield({ mode }),
    slidingWindow({ mode, interval: "1h", max: 5 }),
    validateEmail({
      mode,
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});

export const ajAi = arcjet({
  key: env.ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode,
      refillRate: 20,
      interval: "1h",
      capacity: 20,
    }),
  ],
});
