import type { OmdbRating, OmdbSuccessResponse } from "./types.js";

const MISSING = new Set(["N/A", "", "NA", "-"]);

function isMissing(value: string | undefined | null): value is undefined | null {
  return value === undefined || value === null || MISSING.has(value.trim());
}

export function parseOmdbFloat(value: string | undefined): number | null {
  if (isMissing(value)) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOmdbInt(value: string | undefined): number | null {
  if (isMissing(value)) return null;
  const parsed = Number.parseInt(value.replace(/,/g, "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: string): number | null {
  const percent = /^(\d{1,3})%$/.exec(value.trim());
  if (percent?.[1] !== undefined) return Number.parseInt(percent[1], 10);

  const outOf100 = /^(\d{1,3})\/100$/.exec(value.trim());
  if (outOf100?.[1] !== undefined) return Number.parseInt(outOf100[1], 10);

  return null;
}

export function findRating(ratings: OmdbRating[] | undefined, source: string): number | null {
  const match = ratings?.find((r) => r.Source === source);
  if (match === undefined) return null;
  return parsePercentage(match.Value);
}

export interface OmdbScores {
  imdbId: string;
  imdbRating: number | null;
  imdbVotes: number | null;
  rottenTomatoes: number | null;
  metacritic: number | null;
}

export function mapOmdbScores(raw: OmdbSuccessResponse): OmdbScores {
  return {
    imdbId: raw.imdbID,
    imdbRating: parseOmdbFloat(raw.imdbRating),
    imdbVotes: parseOmdbInt(raw.imdbVotes),
    rottenTomatoes: findRating(raw.Ratings, "Rotten Tomatoes"),
    metacritic: findRating(raw.Ratings, "Metacritic") ?? parseOmdbInt(raw.Metascore),
  };
}
