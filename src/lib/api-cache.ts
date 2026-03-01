// In-memory cache with TTL, request deduplication, and stale-while-revalidate

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Get cached data with request deduplication and stale-while-revalidate.
 *
 * - Fresh (age < ttl): return cached data immediately.
 * - Stale (ttl <= age < staleTtl): return cached data immediately,
 *   trigger background refresh (stale-while-revalidate).
 * - Expired (age >= staleTtl) or missing: block until getter completes.
 *
 * Concurrent requests for the same expired key share a single getter call.
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  getter: () => Promise<T> | T,
  staleTtlMs?: number
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const effectiveStaleTtl = staleTtlMs ?? ttlMs * 3;

  if (entry) {
    const age = now - entry.timestamp;

    // Fresh — return immediately
    if (age < entry.ttl) {
      return entry.data;
    }

    // Stale but within SWR window — return stale, refresh in background
    if (age < effectiveStaleTtl) {
      triggerBackgroundRefresh(key, ttlMs, getter);
      return entry.data;
    }
  }

  // Expired or missing — block and wait, but deduplicate concurrent requests
  return deduplicatedFetch(key, ttlMs, getter);
}

/**
 * Synchronous version with stale-while-revalidate support.
 * Returns stale data immediately and schedules async refresh.
 */
export function getCachedSync<T>(
  key: string,
  ttlMs: number,
  getter: () => T,
  staleTtlMs?: number
): T {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const effectiveStaleTtl = staleTtlMs ?? ttlMs * 3;

  if (entry) {
    const age = now - entry.timestamp;

    // Fresh
    if (age < entry.ttl) {
      return entry.data;
    }

    // Stale but within SWR window — return stale, refresh in next microtask
    if (age < effectiveStaleTtl) {
      if (!pendingRequests.has(key)) {
        const p = Promise.resolve().then(() => {
          try {
            const data = getter();
            cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
          } finally {
            pendingRequests.delete(key);
          }
        });
        pendingRequests.set(key, p);
      }
      return entry.data;
    }
  }

  // Expired or missing — must block
  const data = getter();
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  return data;
}

/** Deduplicate concurrent async fetches for the same cache key. */
async function deduplicatedFetch<T>(
  key: string,
  ttlMs: number,
  getter: () => Promise<T> | T
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      const data = await getter();
      cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
      return data;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

/** Trigger a non-blocking background refresh (SWR pattern). */
function triggerBackgroundRefresh<T>(
  key: string,
  ttlMs: number,
  getter: () => Promise<T> | T
): void {
  if (pendingRequests.has(key)) return; // already refreshing

  const promise = (async () => {
    try {
      const data = await getter();
      cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
