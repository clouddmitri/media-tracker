import CircuitBreaker from "opossum";
import { CircuitOpenError, HttpError, NetworkError, TimeoutError } from "./http-errors.js";
import { withRetry, type RetryOptions } from "./retry.js";

export interface HttpClientOptions {
  provider: string;
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  breaker?: {
    errorThresholdPercentage?: number;
    resetTimeoutMs?: number;
    volumeThreshold?: number;
  };
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  correlationId?: string;
}

export interface HttpClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  isCircuitOpen: () => boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 5000,
};

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const timeoutMs = options.timeoutMs ?? 5000;
  const retryOptions = { ...DEFAULT_RETRY, ...options.retry };

  async function rawFetch<T>(url: string, correlationId?: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...options.defaultHeaders,
          ...(correlationId ? { "X-Request-Id": correlationId } : {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new TimeoutError(url, timeoutMs);
      }
      throw new NetworkError(`Request to ${url} failed`, url, err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new HttpError(
        `${options.provider} responded ${String(response.status)}`,
        response.status,
        body.slice(0, 500),
        url,
      );
    }

    return (await response.json()) as T;
  }

  const breaker = new CircuitBreaker(
    async (url: string, correlationId?: string) =>
      withRetry(
        () => rawFetch<unknown>(url, correlationId),
        retryOptions,
        (attempt, delay, err) => {
          console.warn(
            JSON.stringify({
              level: "warn",
              msg: "retrying request",
              provider: options.provider,
              attempt,
              delayMs: Math.round(delay),
              error: err instanceof Error ? err.message : String(err),
              correlationId,
            }),
          );
        },
      ),
    {
      timeout: false,
      errorThresholdPercentage: options.breaker?.errorThresholdPercentage ?? 50,
      resetTimeout: options.breaker?.resetTimeoutMs ?? 30000,
      volumeThreshold: options.breaker?.volumeThreshold ?? 5,
      name: options.provider,
      errorFilter: (err: unknown) => err instanceof HttpError && !err.isRetryable,
    },
  );

  breaker.on("open", () => {
    console.error(`Circuit OPEN for ${options.provider}`);
  });
  breaker.on("halfOpen", () => {
    console.warn(`Circuit HALF-OPEN for ${options.provider}`);
  });
  breaker.on("close", () => {
    console.log(`Circuit CLOSED for ${options.provider}`);
  });

  return {
    async get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
      const url = buildUrl(options.baseUrl, path, opts.query);
      try {
        return (await breaker.fire(url, opts.correlationId)) as T;
      } catch (err) {
        if (err instanceof Error && err.message.includes("Breaker is open")) {
          throw new CircuitOpenError(options.provider);
        }
        throw err;
      }
    },
    isCircuitOpen: () => breaker.opened,
  };
}
