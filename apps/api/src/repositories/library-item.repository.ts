import type {
  LibraryEntryDTO,
  LibraryStatusValue,
  MediaTypeValue,
  Page,
} from "@media-tracker/shared";
import { prisma } from "../lib/db.js";
import { toNumber } from "../lib/decimal.js";
import type { LibraryEntry } from "../generated/prisma/client.js";
import type { LIBRARY_SORT_FIELDS } from "@media-tracker/shared";

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
    version: row.version,
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

export async function findByIdForUser(id: string, userId: string): Promise<LibraryEntryDTO | null> {
  const row = await prisma.libraryEntry.findFirst({
    where: { id, userId },
  });
  return row ? toDTO(row) : null;
}
export interface LibraryFilters {
  status?: LibraryStatusValue;
  mediaType?: MediaTypeValue;
}

export interface LibrarySort {
  field: (typeof LIBRARY_SORT_FIELDS)[number];
  direction: "asc" | "desc";
}

export async function listByUser(
  userId: string,
  filters: LibraryFilters,
  cursor: string | undefined,
  limit: number,
  sort: LibrarySort = { field: "statusChangedAt", direction: "desc" },
): Promise<Page<LibraryEntryDTO>> {
  const rows = await prisma.libraryEntry.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.mediaType ? { snapshotMediaType: filters.mediaType } : {}),
    },
    orderBy: [{ [sort.field]: sort.direction }, { id: sort.direction }],
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
  expectedVersion?: number;
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

  const { expectedVersion, ...fields } = input;

  const statusChanged = fields.status !== undefined && fields.status !== existing.status;
  const now = new Date();

  const result = await prisma.libraryEntry.updateMany({
    where: {
      id,
      userId,
      ...(expectedVersion !== undefined ? { version: expectedVersion } : {}),
    },
    data: {
      ...fields,
      version: { increment: 1 },
      ...(statusChanged ? { statusChangedAt: now } : {}),
      ...(statusChanged && fields.status === "COMPLETED" && existing.completedAt === null
        ? { completedAt: now }
        : {}),
      ...(statusChanged && fields.status === "WATCHING" && existing.startedAt === null
        ? { startedAt: now }
        : {}),
    },
  });

  if (result.count === 0) return null;

  const updated = await prisma.libraryEntry.findUniqueOrThrow({ where: { id } });
  return toDTO(updated);
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const result = await prisma.libraryEntry.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
