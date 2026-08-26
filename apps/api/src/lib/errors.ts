export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export function getErrorStatus(err: unknown): number {
  if (typeof err === "object" && err !== null) {
    const candidate = err as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === "number") return candidate.status;
    if (typeof candidate.statusCode === "number") return candidate.statusCode;
  }
  return 500;
}
