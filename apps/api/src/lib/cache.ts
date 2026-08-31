import { redis } from "./redis.js";
import { getErrorMessage } from "./errors.js";

export const CACHE_VERSION = "v1";

interface CacheEnvelope<T> {
  value: T;
  staleAt: number;
  cachedAt: number;
}

export interface CacheOptions {
  ttlSeconds: number;
  freshSeconds: number;
}

const LOCK_TTL_SECONDS = 10;
const LOCK_WAIT_MS = 120;
const LOCK_MAX_WAITS = 8;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordHit(kind: "hit" | "miss" | "stale"): Promise<void> {
  try {
    await redis.incr(`cache:stats:${kind}`);
  } catch {
    //
  }
}

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.length < 10 || value.length > 30) return value;
  if (!value.startsWith("2") && !value.startsWith("1")) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await redis.get(key);
    if (raw === null) return null;
    return JSON.parse(raw, reviveDates) as CacheEnvelope<T>;
  } catch (err) {
    console.warn(`cache read failed for ${key}: ${getErrorMessage(err)}`);
    return null;
  }
}

async function writeEnvelope(key: string, value: unknown, options: CacheOptions): Promise<void> {
  try {
    const envelope: CacheEnvelope<unknown> = {
      value,
      cachedAt: Date.now(),
      staleAt: Date.now() + options.freshSeconds * 1000,
    };
    await redis.set(key, JSON.stringify(envelope), "EX", options.ttlSeconds);
  } catch (err) {
    console.warn(`cache write failed for ${key}: ${getErrorMessage(err)}`);
  }
}

async function acquireLock(key: string): Promise<boolean> {
  try {
    const result = await redis.set(`lock:${key}`, "1", "EX", LOCK_TTL_SECONDS, "NX");
    return result === "OK";
  } catch {
    return true;
  }
}

async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(`lock:${key}`);
  } catch {
    //
  }
}

function refreshInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions,
): void {
  void (async () => {
    if (!(await acquireLock(key))) return;
    try {
      const fresh = await fetcher();
      await writeEnvelope(key, fresh, options);
    } catch (err) {
      console.warn(`background refresh failed for ${key}: ${getErrorMessage(err)}`);
    } finally {
      await releaseLock(key);
    }
  })();
}

export async function getOrSet<T>(
  key: string,
  options: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await readEnvelope<T>(key);

  if (cached !== null) {
    if (Date.now() < cached.staleAt) {
      void recordHit("hit");
      return cached.value;
    }
    void recordHit("stale");
    refreshInBackground(key, fetcher, options);
    return cached.value;
  }

  void recordHit("miss");

  if (await acquireLock(key)) {
    try {
      const fresh = await fetcher();
      await writeEnvelope(key, fresh, options);
      return fresh;
    } finally {
      await releaseLock(key);
    }
  }

  for (let i = 0; i < LOCK_MAX_WAITS; i++) {
    await sleep(LOCK_WAIT_MS);
    const filled = await readEnvelope<T>(key);
    if (filled !== null) return filled.value;
  }

  return fetcher();
}

export async function getStats(): Promise<{
  hits: number;
  misses: number;
  stale: number;
  hitRate: number;
}> {
  const [hits, misses, stale] = await redis.mget(
    "cache:stats:hit",
    "cache:stats:miss",
    "cache:stats:stale",
  );

  const h = Number(hits ?? 0);
  const m = Number(misses ?? 0);
  const s = Number(stale ?? 0);
  const total = h + m + s;

  return {
    hits: h,
    misses: m,
    stale: s,
    hitRate: total === 0 ? 0 : Math.round(((h + s) / total) * 100) / 100,
  };
}
