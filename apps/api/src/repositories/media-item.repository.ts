import type { MediaItemDTO, MediaTypeValue } from "@media-tracker/shared";
import { prisma } from "../lib/db.js";
import { toNumber } from "../lib/decimal.js";
import type { MediaItem } from "../generated/prisma/client.js";

function toDTO(row: MediaItem): MediaItemDTO {
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    imdbId: row.imdbId,
    mediaType: row.mediaType,
    title: row.title,
    overview: row.overview,
    posterPath: row.posterPath,
    releaseDate: row.releaseDate,
    runtime: row.runtime,
    imdbRating: toNumber(row.imdbRating),
    rottenTomatoes: row.rottenTomatoes,
    metacritic: row.metacritic,
    tmdbRating: toNumber(row.tmdbRating),
    syncedAt: row.syncedAt,
  };
}

export async function findByTmdbId(
  tmdbId: number,
  mediaType: MediaTypeValue,
): Promise<MediaItemDTO | null> {
  const row = await prisma.mediaItem.findUnique({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
  });
  return row ? toDTO(row) : null;
}

export async function findManyByIds(ids: string[]): Promise<MediaItemDTO[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.mediaItem.findMany({ where: { id: { in: ids } } });
  return rows.map(toDTO);
}

export interface UpsertMediaItemInput {
  tmdbId: number;
  mediaType: MediaTypeValue;
  imdbId?: string | null;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: Date | null;
  runtime?: number | null;
  imdbRating?: number | null;
  imdbVotes?: number | null;
  rottenTomatoes?: number | null;
  metacritic?: number | null;
  tmdbRating?: number | null;
  tmdbVoteCount?: number | null;
}

export async function upsertFromTmdb(input: UpsertMediaItemInput): Promise<MediaItemDTO> {
  const { tmdbId, mediaType, ...rest } = input;
  const payload = { ...rest, syncedAt: new Date() };

  const row = await prisma.mediaItem.upsert({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
    create: { tmdbId, mediaType, ...payload },
    update: payload,
  });
  return toDTO(row);
}

export async function findStale(olderThan: Date, limit: number): Promise<MediaItemDTO[]> {
  const rows = await prisma.mediaItem.findMany({
    where: { syncedAt: { lt: olderThan } },
    orderBy: { syncedAt: "asc" },
    take: limit,
  });
  return rows.map(toDTO);
}
