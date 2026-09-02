import type { ArcjetNodeRequest } from "@arcjet/node";
import type { NextFunction, Request, Response } from "express";
import { getErrorMessage } from "../lib/errors.js";

interface ArcjetInstance {
  protect: (
    req: ArcjetNodeRequest,
    props?: Record<string, unknown>,
  ) => Promise<{
    isDenied: () => boolean;
    isErrored: () => boolean;
    reason: {
      isRateLimit: () => boolean;
      isEmail: () => boolean;
      isShield: () => boolean;
      isBot: () => boolean;
    };
    results: unknown[];
  }>;
}

export interface ProtectOptions {
  onError: "allow" | "deny";
  props?: (req: Request) => Record<string, unknown>;
}

export function protect(aj: ArcjetInstance, options: ProtectOptions) {
  return async function arcjetMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    let decision;

    try {
      decision = await aj.protect(req, options.props?.(req) ?? {});
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "arcjet protect threw",
          requestId: req.id,
          error: getErrorMessage(err),
        }),
      );
      if (options.onError === "deny") {
        res.status(503).json({
          error: "Service Unavailable",
          message: "Unable to verify request. Please try again.",
          requestId: req.id,
        });
        return;
      }
      next();
      return;
    }

    if (decision.isErrored()) {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "arcjet decision errored",
          requestId: req.id,
          failMode: options.onError,
        }),
      );
      if (options.onError === "deny") {
        res.status(503).json({
          error: "Service Unavailable",
          message: "Unable to verify request. Please try again.",
          requestId: req.id,
        });
        return;
      }
      next();
      return;
    }

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please slow down.",
          requestId: req.id,
        });
        return;
      }

      if (decision.reason.isEmail()) {
        res.status(400).json({
          error: "Bad Request",
          message: "That email address can't be used. Please use a different one.",
          requestId: req.id,
        });
        return;
      }

      res.status(403).json({
        error: "Forbidden",
        message: "Request blocked.",
        requestId: req.id,
      });
      return;
    }

    next();
  };
}
