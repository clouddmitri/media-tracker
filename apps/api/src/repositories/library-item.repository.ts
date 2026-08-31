import type {
  LibraryEntryDTO,
  LibraryStatusValue,
  MediaTypeValue,
  Page,
} from "@media-tracker/shared";
import { prisma } from "../lib/db.js";
import { toNumber } from "../lib/decimal.js";
import type { LibraryEntry } from "../generated/prisma/client.js";

function toDTO(row: LibraryEntry): LibraryEntryDTO {
  return {
    id: row.id,
    mediaItemId: row.mediaItemId,
    status: row.status,
    userRating: toNumber(row.userRating),
    review: row.review,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    statusChangedAt: row.statusChangedAt,
    snapshotTitle: row.snapshotTitle,
    snapshotPosterPath: row.snapshotPosterPath,
    snapshotMediaType: row.snapshotMediaType,
  };
}

export async function findByUserAndMediaItem(
  userId: string,
  mediaItemId: string,
): Promise<LibraryEntryDTO | null> {
  const row = await prisma.libraryEntry.findUnique({
    where: { userId_mediaItemId: { userId, mediaItemId } },
  });
  return row ? toDTO(row) : null;
}

export interface LibraryFilters {
  status?: LibraryStatusValue;
  mediaType?: MediaTypeValue;
}

export async function listByUser(
  userId: string,
  filters: LibraryFilters,
  cursor: string | undefined,
  limit: number,
): Promise<Page<LibraryEntryDTO>> {
  const rows = await prisma.libraryEntry.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.mediaType ? { snapshotMediaType: filters.mediaType } : {}),
    },
    orderBy: [{ statusChangedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

  return { items: items.map(toDTO), nextCursor };
}

export interface CreateLibraryEntryInput {
  userId: string;
  mediaItemId: string;
  status: LibraryStatusValue;
  snapshotTitle: string;
  snapshotPosterPath: string | null;
  snapshotReleaseDate: Date | null;
  snapshotMediaType: MediaTypeValue;
}

export async function create(input: CreateLibraryEntryInput): Promise<LibraryEntryDTO> {
  const now = new Date();
  const row = await prisma.libraryEntry.create({
    data: {
      ...input,
      statusChangedAt: now,
      snapshotAt: now,
      ...(input.status !== "WANT_TO_WATCH" ? { startedAt: now } : {}),
      ...(input.status === "COMPLETED" ? { completedAt: now } : {}),
    },
  });
  return toDTO(row);
}

export interface UpdateLibraryEntryInput {
  status?: LibraryStatusValue;
  userRating?: number | null;
  review?: string | null;
}

export async function update(
  id: string,
  userId: string,
  input: UpdateLibraryEntryInput,
): Promise<LibraryEntryDTO | null> {
  const existing = await prisma.libraryEntry.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const statusChanged = input.status !== undefined && input.status !== existing.status;

  const now = new Date();

  const row = await prisma.libraryEntry.update({
    where: { id },
    data: {
      ...input,
      ...(statusChanged ? { statusChangedAt: now } : {}),
      ...(statusChanged && input.status === "COMPLETED" && !existing.completedAt
        ? { completedAt: now }
        : {}),
      ...(statusChanged && input.status === "WATCHING" && !existing.startedAt
        ? { startedAt: now }
        : {}),
    },
  });
  return toDTO(row);
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const result = await prisma.libraryEntry.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
