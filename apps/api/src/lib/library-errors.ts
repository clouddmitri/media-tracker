import type { Request, Response } from "express";
import {
  AlreadyInLibraryError,
  EntryNotFoundError,
  MediaNotFoundError,
  StaleVersionError,
} from "../services/library-service.js";
import { IllegalTransitionError } from "../services/library-state.js";

export function handleLibraryError(err: unknown, req: Request, res: Response): boolean {
  const base = { requestId: req.id };

  if (err instanceof EntryNotFoundError) {
    res.status(404).json({ error: "Not Found", message: err.message, ...base });
    return true;
  }

  if (err instanceof MediaNotFoundError) {
    res.status(404).json({ error: "Not Found", message: err.message, ...base });
    return true;
  }

  if (err instanceof AlreadyInLibraryError) {
    res.status(409).json({ error: "Conflict", message: err.message, ...base });
    return true;
  }

  if (err instanceof IllegalTransitionError) {
    res.status(409).json({
      error: "Conflict",
      message: err.message,
      from: err.from,
      to: err.to,
      ...base,
    });
    return true;
  }

  if (err instanceof StaleVersionError) {
    res.status(409).json({
      error: "Conflict",
      message: err.message,
      hint: "Fetch the entry again and retry with the current version.",
      ...base,
    });
    return true;
  }

  return false;
}
