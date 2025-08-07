/**
 * CacheStore interface and in-memory implementation.
 * - Minimal API for T3 acceptance: get/set with TTL and lastUpdated metadata.
 */

export type CacheGetResult<T> = {
  value: T | null;
  lastUpdated: number | null;
};

export type CacheStore = {
  get<T>(key: string): Promise<CacheGetResult<T>>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
};

export class InMemoryCacheStore implements CacheStore {
  private store = new Map<
    string,
    { value: unknown; expiresAt: number; lastUpdated: number }
  >();

  constructor(private readonly nowFn: () => number = () => Date.now()) {}

  async get<T>(key: string): Promise<CacheGetResult<T>> {
    const entry = this.store.get(key);
    const now = this.nowFn();
    if (!entry) {
      return { value: null, lastUpdated: null };
    }
    if (entry.expiresAt <= now) {
      // Expired: delete and return miss
      this.store.delete(key);
      return { value: null, lastUpdated: entry.lastUpdated };
    }
    return { value: entry.value as T, lastUpdated: entry.lastUpdated };
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const now = this.nowFn();
    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      lastUpdated: now,
    });
  }
}
