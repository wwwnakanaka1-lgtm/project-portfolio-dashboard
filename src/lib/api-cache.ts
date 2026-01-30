// Simple in-memory cache with TTL for API responses

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached data or execute the getter function if cache is stale
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  getter: () => Promise<T> | T
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && now - entry.timestamp < entry.ttl) {
    return entry.data;
  }

  const data = await getter();
  cache.set(key, { data, timestamp: now, ttl: ttlMs });
  return data;
}

/**
 * Synchronous version for sync getters
 */
export function getCachedSync<T>(
  key: string,
  ttlMs: number,
  getter: () => T
): T {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && now - entry.timestamp < entry.ttl) {
    return entry.data;
  }

  const data = getter();
  cache.set(key, { data, timestamp: now, ttl: ttlMs });
  return data;
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
