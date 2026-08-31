import { createHttpClient } from "../../lib/http-client.js";

export const omdbClient = createHttpClient({
  provider: "omdb",
  baseUrl: "https://www.omdbapi.com/",
  timeoutMs: 5000,
  retry: { maxAttempts: 3, baseDelayMs: 300, maxDelayMs: 4000 },
  breaker: { errorThresholdPercentage: 50, resetTimeoutMs: 30000, volumeThreshold: 5 },
});
