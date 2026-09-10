import { describe, expect, it } from "vitest";
import { LIBRARY_STATUSES } from "@media-tracker/shared";
import type { LibraryStatusValue } from "@media-tracker/shared";
import {
  IllegalTransitionError,
  assertTransition,
  canTransition,
  nextStates,
} from "./library-state.js";

const LEGAL: [LibraryStatusValue, LibraryStatusValue][] = [
  ["WANT_TO_WATCH", "WATCHING"],
  ["WANT_TO_WATCH", "COMPLETED"],
  ["WANT_TO_WATCH", "DROPPED"],
  ["WATCHING", "COMPLETED"],
  ["WATCHING", "DROPPED"],
  ["WATCHING", "ON_HOLD"],
  ["ON_HOLD", "WATCHING"],
  ["ON_HOLD", "COMPLETED"],
  ["ON_HOLD", "DROPPED"],
  ["COMPLETED", "WATCHING"],
  ["COMPLETED", "DROPPED"],
  ["DROPPED", "WANT_TO_WATCH"],
  ["DROPPED", "WATCHING"],
];

function isLegal(from: LibraryStatusValue, to: LibraryStatusValue): boolean {
  return LEGAL.some(([f, t]) => f === from && t === to);
}

describe("canTransition", () => {
  it.each(LEGAL)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it("allows every self-transition as a no-op", () => {
    for (const status of LIBRARY_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it("rejects every transition not in the allowed set", () => {
    const rejected: string[] = [];

    for (const from of LIBRARY_STATUSES) {
      for (const to of LIBRARY_STATUSES) {
        if (from === to) continue;
        if (isLegal(from, to)) continue;
        if (canTransition(from, to)) {
          rejected.push(`${from} -> ${to} was allowed but should not be`);
        }
      }
    }

    expect(rejected).toEqual([]);
  });

  it("does not allow COMPLETED back to WANT_TO_WATCH", () => {
    expect(canTransition("COMPLETED", "WANT_TO_WATCH")).toBe(false);
  });

  it("does not allow DROPPED to ON_HOLD", () => {
    expect(canTransition("DROPPED", "ON_HOLD")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw on a legal transition", () => {
    expect(() => {
      assertTransition("WANT_TO_WATCH", "WATCHING");
    }).not.toThrow();
  });

  it("throws IllegalTransitionError with from and to attached", () => {
    try {
      assertTransition("COMPLETED", "WANT_TO_WATCH");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(IllegalTransitionError);
      const typed = err as IllegalTransitionError;
      expect(typed.from).toBe("COMPLETED");
      expect(typed.to).toBe("WANT_TO_WATCH");
    }
  });
});

describe("nextStates", () => {
  it("returns only reachable states", () => {
    for (const from of LIBRARY_STATUSES) {
      for (const to of nextStates(from)) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });

  it("never includes the current state", () => {
    for (const status of LIBRARY_STATUSES) {
      expect(nextStates(status)).not.toContain(status);
    }
  });

  it("gives WATCHING three onward options", () => {
    expect(nextStates("WATCHING")).toHaveLength(3);
  });
});
