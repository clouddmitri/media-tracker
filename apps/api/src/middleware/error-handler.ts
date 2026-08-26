import type { ErrorRequestHandler } from "express";
import { getErrorMessage, getErrorStatus } from "../lib/errors.js";
import { isProduction } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = getErrorStatus(err);
  const message = getErrorMessage(err);

  console.error(
    JSON.stringify({
      level: "error",
      requestId: req.id,
      method: req.method,
      path: req.path,
      status,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  res.status(status).json({
    error: status >= 500 ? "Internal Server Error" : message,
    message: status >= 500 && isProduction ? "An unexpected error occurred" : message,
    requestId: req.id,
    ...(isProduction || !(err instanceof Error) ? {} : { stack: err.stack }),
  });
};
