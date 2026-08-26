import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("X-Request-Id");
  req.id = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};
