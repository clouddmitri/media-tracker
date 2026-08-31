import { CACHE_VERSION, getOrSet, type CacheOptions } from "../lib/cache.js";
import * as tmdb from "./tmdb/index.js";
import * as omdb from "./omdb/index.js";

const HOUR = 3600;
const DAY = 24 * HOUR;

const TTL = {
  search: { ttlSeconds: 2 * HOUR, freshSeconds: HOUR },
  details: { ttlSeconds: 2 * DAY, freshSeconds: DAY },
  trending: { ttlSeconds: 12 * HOUR, freshSeconds: 6 * HOUR },
  omdb: { ttlSeconds: 14 * DAY, freshSeconds: 7 * DAY },
  genres: { ttlSeconds: 7 * DAY, freshSeconds: 3 * DAY },
} satisfies Record<string, CacheOptions>;

function key(...parts: (string | number)[]): string {
  return parts.map(String).join(":");
}

export async function getDetails(
  tmdbId: number,
  mediaType: "MOVIE" | "TV",
  correlationId?: string,
) {
  return getOrSet(key("tmdb", CACHE_VERSION, mediaType.toLowerCase(), tmdbId), TTL.details, () =>
    tmdb.getDetails(tmdbId, mediaType, correlationId),
  );
}

export async function searchMulti(query: string, page = 1, correlationId?: string) {
  const normalized = query.trim().toLowerCase();
  return getOrSet(key("tmdb", CACHE_VERSION, "search", normalized, page), TTL.search, () =>
    tmdb.searchMulti(query, page, correlationId),
  );
}

export async function getTrending(
  mediaType: "MOVIE" | "TV",
  window: "day" | "week" = "week",
  correlationId?: string,
) {
  return getOrSet(
    key("tmdb", CACHE_VERSION, "trending", mediaType.toLowerCase(), window),
    TTL.trending,
    () => tmdb.getTrending(mediaType, window, correlationId),
  );
}

export async function getScores(imdbId: string, correlationId?: string) {
  return getOrSet(key("omdb", CACHE_VERSION, imdbId), TTL.omdb, () =>
    omdb.getByImdbId(imdbId, correlationId),
  );
}
