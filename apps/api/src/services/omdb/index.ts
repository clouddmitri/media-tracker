import { env } from "../../config/env.js";
import { omdbClient } from "./client.js";
import { mapOmdbScores, type OmdbScores } from "./mappers.js";
import type { OmdbResponse } from "./types.js";

export type { OmdbScores };

const NOT_FOUND_PATTERNS = [/not found/i, /incorrect imdb/i, /error getting data/i];

export class OmdbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OmdbConfigError";
  }
}

export async function getByImdbId(
  imdbId: string,
  correlationId?: string,
): Promise<OmdbScores | null> {
  const raw = await omdbClient.get<OmdbResponse>("", {
    query: { apikey: env.OMDB_API_KEY, i: imdbId },
    ...(correlationId ? { correlationId } : {}),
  });

  if (raw.Response === "True") {
    return mapOmdbScores(raw);
  }

  if (NOT_FOUND_PATTERNS.some((p) => p.test(raw.Error))) {
    return null;
  }

  throw new OmdbConfigError(`OMDb error for ${imdbId}: ${raw.Error}`);
}
