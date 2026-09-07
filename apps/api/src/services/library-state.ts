import type { LibraryStatusValue } from "@media-tracker/shared";

const ALLOWED_TRANSITIONS = new Map<LibraryStatusValue, LibraryStatusValue[]>([
  ["WANT_TO_WATCH", ["WATCHING", "COMPLETED", "DROPPED"]],
  ["WATCHING", ["COMPLETED", "DROPPED", "ON_HOLD"]],
  ["ON_HOLD", ["WATCHING", "COMPLETED", "DROPPED"]],
  ["COMPLETED", ["WATCHING", "DROPPED"]],
  ["DROPPED", ["WANT_TO_WATCH", "WATCHING"]],
]);

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: LibraryStatusValue,
    readonly to: LibraryStatusValue,
  ) {
    super(`Cannot move from ${from} to ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: LibraryStatusValue, to: LibraryStatusValue): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS.get(from)?.includes(to) ?? false;
}

export function assertTransition(from: LibraryStatusValue, to: LibraryStatusValue): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

export function nextStates(from: LibraryStatusValue): LibraryStatusValue[] {
  return ALLOWED_TRANSITIONS.get(from) ?? [];
}
