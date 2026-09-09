import { Router } from "express";
import {
  addToLibrarySchema,
  listLibrarySchema,
  updateLibraryEntrySchema,
  episodeParamsSchema,
} from "@media-tracker/shared";
import * as libraryService from "../services/library-service.js";
import { nextStates } from "../services/library-state.js";
import { requireAuth, requireUser } from "../middleware/require-auth.js";
import { handleLibraryError } from "../lib/library-errors.js";

export const libraryRouter: Router = Router();

libraryRouter.use(requireAuth);

libraryRouter.post("/", async (req, res) => {
  const parsed = addToLibrarySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
      requestId: req.id,
    });
    return;
  }

  try {
    const entry = await libraryService.addToLibrary(requireUser(req).id, parsed.data, req.id);
    res.status(201).json({ entry });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.get("/", async (req, res) => {
  const parsed = listLibrarySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid query parameters",
      requestId: req.id,
    });
    return;
  }

  const page = await libraryService.listEntries(requireUser(req).id, parsed.data);

  res.json({
    items: page.items,
    nextCursor: page.nextCursor,
    hasMore: page.nextCursor !== null,
  });
});

libraryRouter.get("/stats", async (req, res) => {
  const stats = await libraryService.getStats(requireUser(req).id);
  res.json({ stats });
});

libraryRouter.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const entry = await libraryService.getEntry(requireUser(req).id, id);
    res.json({ entry, allowedTransitions: nextStates(entry.status) });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.patch("/:id", async (req, res) => {
  const id = req.params.id;

  const parsed = updateLibraryEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
      requestId: req.id,
    });
    return;
  }

  try {
    const entry = await libraryService.updateEntry(requireUser(req).id, id, parsed.data);
    res.json({ entry, allowedTransitions: nextStates(entry.status) });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await libraryService.removeEntry(requireUser(req).id, id);
    res.status(204).end();
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.put("/:id/episodes/:season/:episode", async (req, res) => {
  const id = req.params.id;
  const parsed = episodeParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid episode parameters",
      requestId: req.id,
    });
    return;
  }

  try {
    const progress = await libraryService.markEpisodeWatched(
      requireUser(req).id,
      id,
      parsed.data.season,
      parsed.data.episode,
    );
    res.json({ progress });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.delete("/:id/episodes/:season/:episode", async (req, res) => {
  const id = req.params.id;
  const parsed = episodeParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid episode parameters",
      requestId: req.id,
    });
    return;
  }

  try {
    const progress = await libraryService.markEpisodeUnwatched(
      requireUser(req).id,
      id,
      parsed.data.season,
      parsed.data.episode,
    );
    res.json({ progress });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});

libraryRouter.get("/:id/progress", async (req, res) => {
  const id = req.params.id;
  const parsed = episodeParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Bad Request",
      message: parsed.error.issues[0]?.message ?? "Invalid episode parameters",
      requestId: req.id,
    });
    return;
  }

  try {
    const progress = await libraryService.getProgress(requireUser(req).id, id);
    res.json({ progress });
  } catch (err) {
    if (!handleLibraryError(err, req, res)) throw err;
  }
});
