import { HttpError, NetworkError, TimeoutError } from "./http-errors.js";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.isRetryable;
  if (err instanceof NetworkError) return true;
  if (err instanceof TimeoutError) return true;
  return false;
}

function backoffDelay(attempt: number, opts: RetryOptions): number {
  const exponential = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
  return Math.random() * exponential;
}

function retryAfterMs(err: unknown): number | null {
  if (!(err instanceof HttpError) || err.status !== 429) return null;
  return null;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isRetryable(err) || attempt === opts.maxAttempts - 1) {
        throw err;
      }

      const delay = retryAfterMs(err) ?? backoffDelay(attempt, opts);
      onRetry?.(attempt + 1, delay, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
