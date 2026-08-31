import { createHttpClient } from "../../lib/http-client.js";
import { env } from "../../config/env.js";

export const tmdbClient = createHttpClient({
  provider: "tmdb",
  baseUrl: "https://api.themoviedb.org/3/",
  defaultHeaders: {
    Authorization: `Bearer ${env.TMDB_READ_TOKEN}`,
  },
  timeoutMs: 5000,
  retry: { maxAttempts: 3, baseDelayMs: 300, maxDelayMs: 4000 },
  breaker: { errorThresholdPercentage: 50, resetTimeoutMs: 30000, volumeThreshold: 5 },
});

export const TMDB_IMAGE_BASE = "https://media.themoviedb.org/t/p/";
