import type { MediaItemDTO, MediaTypeValue } from "@media-tracker/shared";
import * as cached from "./cached-media.js";
import * as mediaItemRepo from "../repositories/media-item.repository.js";
import { OmdbConfigError } from "./omdb/index.js";
import { HttpError } from "../lib/http-errors.js";
import { getErrorMessage } from "../lib/errors.js";
import type { SearchItem } from "./tmdb/index.js";
import * as reviewRepo from "../repositories/external-review.repository.js";
import type { ExternalReviewDTO } from "@media-tracker/shared";
import * as tmdb from "./tmdb/index.js";

async function fetchScoresSafely(
  imdbId: string | null,
  correlationId?: string,
): Promise<{
  imdbRating: number | null;
  imdbVotes: number | null;
  rottenTomatoes: number | null;
  metacritic: number | null;
}> {
  const empty = {
    imdbRating: null,
    imdbVotes: null,
    rottenTomatoes: null,
    metacritic: null,
  };

  if (imdbId === null) return empty;

  try {
    const scores = await cached.getScores(imdbId, correlationId);
    if (scores === null) return empty;
    return {
      imdbRating: scores.imdbRating,
      imdbVotes: scores.imdbVotes,
      rottenTomatoes: scores.rottenTomatoes,
      metacritic: scores.metacritic,
    };
  } catch (err) {
    const level = err instanceof OmdbConfigError ? "error" : "warn";
    console[level === "error" ? "error" : "warn"](
      JSON.stringify({
        level,
        msg: "omdb enrichment failed, continuing without scores",
        imdbId,
        error: getErrorMessage(err),
        correlationId,
      }),
    );
    return empty;
  }
}

export async function fetchAndPersist(
  tmdbId: number,
  mediaType: MediaTypeValue,
  correlationId?: string,
): Promise<MediaItemDTO | null> {
  let details;
  try {
    details = await cached.getDetails(tmdbId, mediaType, correlationId);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      return null;
    }
    throw err;
  }

  const scores = await fetchScoresSafely(details.imdbId ?? null, correlationId);

  return mediaItemRepo.upsertFromTmdb({ ...details, ...scores });
}

export async function getOrCreate(
  tmdbId: number,
  mediaType: MediaTypeValue,
  correlationId?: string,
): Promise<MediaItemDTO | null> {
  const existing = await mediaItemRepo.findByTmdbId(tmdbId, mediaType);
  if (existing !== null) return existing;
  return fetchAndPersist(tmdbId, mediaType, correlationId);
}

export async function search(
  query: string,
  page = 1,
  correlationId?: string,
): Promise<{ items: SearchItem[]; page: number; totalPages: number }> {
  const result = await cached.searchMulti(query, page, correlationId);
  return {
    items: result.items,
    page: result.page,
    totalPages: result.totalPages,
  };
}

export async function trending(
  mediaType: MediaTypeValue,
  window: "day" | "week" = "week",
  correlationId?: string,
): Promise<SearchItem[]> {
  return cached.getTrending(mediaType, window, correlationId);
}

export async function fetchReviews(
  mediaItemId: string,
  tmdbId: number,
  mediaType: MediaTypeValue,
  correlationId?: string,
): Promise<ExternalReviewDTO[]> {
  try {
    const reviews = await tmdb.getReviews(tmdbId, mediaType, correlationId);
    if (reviews.length > 0) {
      await reviewRepo.upsertMany(
        mediaItemId,
        reviews.map((r) => ({
          externalId: r.externalId,
          author: r.author,
          content: r.content,
          rating: r.rating,
          url: r.url,
          publishedAt: r.publishedAt,
        })),
      );
    }
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "review fetch failed, serving stored reviews",
        tmdbId,
        error: getErrorMessage(err),
        correlationId,
      }),
    );
  }

  return reviewRepo.findByMediaItem(mediaItemId, 10);
}
