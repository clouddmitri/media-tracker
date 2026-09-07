import type {
  AddToLibraryInput,
  LibraryEntryDTO,
  ListLibraryQuery,
  Page,
  UpdateLibraryEntryInput,
} from "@media-tracker/shared";
import * as libraryRepo from "../repositories/library-item.repository.js";
import * as agg from "./media-aggregator.js";
import { assertTransition } from "./library-state.js";

export class MediaNotFoundError extends Error {
  constructor(tmdbId: number) {
    super(`No title found for TMDB id ${String(tmdbId)}`);
    this.name = "MediaNotFoundError";
  }
}

export class AlreadyInLibraryError extends Error {
  constructor() {
    super("This title is already in your library");
    this.name = "AlreadyInLibraryError";
  }
}

export class EntryNotFoundError extends Error {
  constructor() {
    super("Library entry not found");
    this.name = "EntryNotFoundError";
  }
}

export class StaleVersionError extends Error {
  constructor() {
    super("Entry was modified by another request");
    this.name = "StaleVersionError";
  }
}

function sanitizeReview(text: string | null): string | null {
  if (text === null) return null;
  const cleaned = text.replace(/[<>]/g, "").trim();
  return cleaned === "" ? null : cleaned;
}

export async function addToLibrary(
  userId: string,
  input: AddToLibraryInput,
  correlationId?: string,
): Promise<LibraryEntryDTO> {
  const mediaItem = await agg.getOrCreate(input.tmdbId, input.mediaType, correlationId);

  if (mediaItem === null) {
    throw new MediaNotFoundError(input.tmdbId);
  }

  const existing = await libraryRepo.findByUserAndMediaItem(userId, mediaItem.id);
  if (existing !== null) {
    throw new AlreadyInLibraryError();
  }

  return libraryRepo.create({
    userId,
    mediaItemId: mediaItem.id,
    status: input.status,
    snapshotTitle: mediaItem.title,
    snapshotPosterPath: mediaItem.posterPath,
    snapshotReleaseDate: mediaItem.releaseDate,
    snapshotMediaType: mediaItem.mediaType,
  });
}

export async function listEntries(
  userId: string,
  query: ListLibraryQuery,
): Promise<Page<LibraryEntryDTO>> {
  return libraryRepo.listByUser(
    userId,
    {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.mediaType !== undefined ? { mediaType: query.mediaType } : {}),
    },
    query.cursor,
    query.limit,
  );
}

export async function getEntry(userId: string, entryId: string): Promise<LibraryEntryDTO> {
  const entry = await libraryRepo.findByIdForUser(entryId, userId);
  if (entry === null) throw new EntryNotFoundError();
  return entry;
}

export async function updateEntry(
  userId: string,
  entryId: string,
  input: UpdateLibraryEntryInput,
): Promise<LibraryEntryDTO> {
  const existing = await libraryRepo.findByIdForUser(entryId, userId);
  if (existing === null) throw new EntryNotFoundError();

  if (input.status !== undefined) {
    assertTransition(existing.status, input.status);
  }

  const updated = await libraryRepo.update(entryId, userId, {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.userRating !== undefined ? { userRating: input.userRating } : {}),
    ...(input.review !== undefined ? { review: sanitizeReview(input.review) } : {}),
    expectedVersion: input.version ?? existing.version,
  });

  if (updated === null) throw new StaleVersionError();
  return updated;
}

export async function removeEntry(userId: string, entryId: string): Promise<void> {
  const removed = await libraryRepo.remove(entryId, userId);
  if (!removed) throw new EntryNotFoundError();
}
