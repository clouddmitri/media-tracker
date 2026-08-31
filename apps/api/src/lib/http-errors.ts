export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
    readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    readonly url: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(`Request to ${url} timed out after ${String(timeoutMs)}ms`);
    this.name = "TimeoutError";
  }
}

export class CircuitOpenError extends Error {
  constructor(readonly provider: string) {
    super(`Circuit breaker open for ${provider}`);
    this.name = "CircuitOpenError";
  }
}
