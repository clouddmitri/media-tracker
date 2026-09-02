import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/token.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.get("Authorization");

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header",
      requestId: req.id,
    });
    return;
  }

  const payload = await verifyAccessToken(header.slice(7));

  if (payload === null) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
      requestId: req.id,
    });
    return;
  }

  req.user = { id: payload.userId };
  next();
}

export function requireUser(req: Request): { id: string } {
  if (req.user === undefined) {
    throw new Error("requireUser called without requireAuth middleware");
  }
  return req.user;
}
