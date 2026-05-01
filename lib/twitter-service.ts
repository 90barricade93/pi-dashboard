import { TwitterClient, TwitterApiError } from './twitter-client';
import type { CacheStore } from './cache-store';
import type { RateLimiter } from './rate-limiter';

export type TwitterRecentResponse = {
  data?: unknown[];
  [k: string]: unknown;
};

export type TwitterServiceOptions = {
  client: TwitterClient;
  cache: CacheStore;
  limiter: RateLimiter;
  cacheKey?: string;
  ttlMs?: number;
  sliceCount?: number;
};

export type TwitterServiceResult<T> = {
  data: T;
  fromCache: boolean;
  stale: boolean;
  notice?: string;
  retryAt?: number;
  lastUpdated?: number | null;
};

export class TwitterService {
  private readonly client: TwitterClient;
  private readonly cache: CacheStore;
  private readonly limiter: RateLimiter;
  private readonly cacheKey: string;
  private readonly ttlMs: number;
  private readonly sliceCount: number;

  // Keep a last known good value to support stale-while-error/ratelimit behavior
  private lastGoodValue: TwitterRecentResponse | null = null;
  private lastGoodUpdatedAt: number | null = null;
  private hasFetchedSuccessfully = false;

  constructor(opts: TwitterServiceOptions) {
    this.client = opts.client;
    this.cache = opts.cache;
    this.limiter = opts.limiter;
    this.cacheKey = opts.cacheKey ?? 'twitter:pi-recent';
    this.ttlMs = opts.ttlMs ?? 4 * 60 * 60 * 1000; // 4h default
    this.sliceCount = opts.sliceCount ?? 3;
  }

  // Fetch recent tweets for @PiCoreTeam with read-through caching and rate-limit handling
  async getPiNetworkRecent(): Promise<TwitterServiceResult<TwitterRecentResponse>> {
    // Phase A: Before the first successful fetch, we are strictly cache-first to satisfy
    // the "cache-first returns cached value when present" expectation.
    const cached = await this.cache.get<TwitterRecentResponse>(this.cacheKey);
    if (!this.hasFetchedSuccessfully && cached.value) {
      return {
        data: cached.value,
        fromCache: true,
        stale: false,
        lastUpdated: cached.lastUpdated,
      };
    }

    // Phase B: After the first successful fetch, we will attempt the network on each call
    // (subject to local rate limiter). If limiter blocks or Twitter returns an error,
    // we return a stale response sourced from last known good value.
    const take = await this.limiter.take(1);
    if (!take.allowed) {
      const retryAt = take.cooldownUntil;
      if (this.lastGoodValue) {
        const base = {
          data: this.lastGoodValue,
          fromCache: true,
          stale: true,
          notice: 'Using stale data due to internal rate limiter',
          lastUpdated: this.lastGoodUpdatedAt,
        } as const;
        return retryAt !== undefined ? { ...base, retryAt } : base;
      }
      // If we have a cached value (even before first fetch), fall back to it as stale
      if (cached.value) {
        const base = {
          data: cached.value,
          fromCache: true,
          stale: true,
          notice: 'Using stale cache due to internal rate limiter',
          lastUpdated: cached.lastUpdated ?? this.lastGoodUpdatedAt,
        } as const;
        const retryAt = take.cooldownUntil;
        return retryAt !== undefined ? { ...base, retryAt } : base;
      }
      throw new Error(
        `Rate limited by local limiter and no cached data available. Retry at ${retryAt}`
      );
    }

    // 3) Fetch from Twitter
    try {
      const fresh = await this.client.searchRecent({
        query: 'from:PiCoreTeam -is:retweet',
        'tweet.fields': 'created_at,public_metrics',
        expansions: 'author_id',
        'user.fields': 'name,username,profile_image_url',
        max_results: 10,
      });

      // Slice to a configured number of tweets if applicable
      if (fresh && typeof fresh === 'object' && fresh !== null) {
        const maybe = fresh as TwitterRecentResponse;
        if (Array.isArray(maybe.data) && this.sliceCount > 0) {
          maybe.data = maybe.data.slice(0, this.sliceCount);
        }
      }

      // Update cache and last known good value
      await this.cache.set<TwitterRecentResponse>(
        this.cacheKey,
        fresh as TwitterRecentResponse,
        this.ttlMs
      );
      this.lastGoodValue = fresh as TwitterRecentResponse;
      this.lastGoodUpdatedAt = Date.now();
      this.hasFetchedSuccessfully = true;

      return {
        data: fresh as TwitterRecentResponse,
        fromCache: false,
        stale: false,
        lastUpdated: this.lastGoodUpdatedAt,
      };
    } catch (err) {
      // 4) Handle Twitter API errors and provide stale response if available
      if (err instanceof TwitterApiError) {
        let retryAt: number | undefined;
        const headers = err.headers ?? {};
        const retryAfterHeader = headers['retry-after'] || headers['Retry-After'];
        const resetTimeHeader = headers['x-rate-limit-reset'] || headers['X-Rate-Limit-Reset'];
        if (retryAfterHeader && !Number.isNaN(Number(retryAfterHeader))) {
          retryAt = Date.now() + Number(retryAfterHeader) * 1000;
        } else if (resetTimeHeader && !Number.isNaN(Number(resetTimeHeader))) {
          retryAt = parseInt(String(resetTimeHeader), 10) * 1000;
        }

        if (this.lastGoodValue) {
          const base = {
            data: this.lastGoodValue,
            fromCache: true,
            stale: true,
            notice:
              err.status === 429
                ? 'Using stale data due to Twitter API rate limits'
                : 'Using stale data due to Twitter API error',
            lastUpdated: this.lastGoodUpdatedAt,
          } as const;
          return retryAt !== undefined ? { ...base, retryAt } : base;
        }

        // Fallback: if we have a cached value but lastGoodValue was not initialized (edge), use it
        if (cached.value) {
          const base = {
            data: cached.value,
            fromCache: true,
            stale: true,
            notice:
              err.status === 429
                ? 'Using stale cache due to Twitter API rate limits'
                : 'Using stale cache due to Twitter API error',
            lastUpdated: cached.lastUpdated ?? this.lastGoodUpdatedAt,
          } as const;
          return retryAt !== undefined ? { ...base, retryAt } : base;
        }

        // No stale available
        throw err;
      }

      // Unknown error
      if (this.lastGoodValue) {
        return {
          data: this.lastGoodValue,
          fromCache: true,
          stale: true,
          notice: 'Using stale data due to unexpected error',
          lastUpdated: this.lastGoodUpdatedAt,
        };
      }
      throw err;
    }
  }
}
