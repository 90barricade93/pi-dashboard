import { NextResponse } from 'next/server';
import { TwitterClient, TwitterApiError } from '@/lib/twitter-client';
import type { RecentSearchResponse } from '@/lib/twitter-client';
import { logger as baseLogger } from '@/lib/logger';
import { recordTwitterRateLimit, recordTwitterApiError } from '@/lib/metrics';

// In-memory cache for tweets
let tweetCache: {
  data: RecentSearchResponse;
  timestamp: number;
} | null = null;

// Cache duration in milliseconds (4 hours)
const CACHE_DURATION = 4 * 60 * 60 * 1000;

// Rate limit status
let isRateLimited = false;
let rateLimitResetTime = 0;

// Function to check if we should make a new API call based on TTL
function shouldFetchNewTweets() {
  const now = Date.now();
  const lastFetchTime = tweetCache?.timestamp ?? 0;

  // If no cache or cache expired (older than TTL), fetch new tweets
  if (!lastFetchTime) return true;
  return now - lastFetchTime >= CACHE_DURATION;
}

// Normalize any server/cache payload into the UI-expected shape
function normalizeResponse(input: unknown): RecentSearchResponse {
  if (!input || typeof input !== 'object') {
    return { data: [], includes: { users: [] } };
  }

  const obj = input as Record<string, unknown>;
  type DataArray = NonNullable<RecentSearchResponse['data']>;
  type UsersArray = NonNullable<NonNullable<RecentSearchResponse['includes']>['users']>;

  const data: DataArray = Array.isArray(obj['data']) ? (obj['data'] as DataArray) : [];

  const includesCandidate = obj['includes'];
  const includesObj: Record<string, unknown> =
    includesCandidate && typeof includesCandidate === 'object'
      ? (includesCandidate as Record<string, unknown>)
      : {};
  const users: UsersArray = Array.isArray(includesObj['users'])
    ? (includesObj['users'] as UsersArray)
    : [];

  const out: RecentSearchResponse = {
    data,
    includes: { users },
  };

  if (typeof obj['meta'] !== 'undefined') {
    out.meta = obj['meta'] as RecentSearchResponse['meta'];
  }
  const fromCacheVal = (obj as Record<string, unknown>)['fromCache'];
  if (typeof fromCacheVal === 'boolean') out.fromCache = fromCacheVal;
  const noticeVal = (obj as Record<string, unknown>)['notice'];
  if (typeof noticeVal === 'string') out.notice = noticeVal;
  const retryAtVal = (obj as Record<string, unknown>)['retryAt'];
  if (typeof retryAtVal === 'number') out.retryAt = retryAtVal;
  const staleVal = (obj as Record<string, unknown>)['stale'];
  if (typeof staleVal === 'boolean') out.stale = staleVal;
  const lastUpdatedVal = (obj as Record<string, unknown>)['lastUpdated'];
  if (typeof lastUpdatedVal === 'number') out.lastUpdated = lastUpdatedVal;
  return out;
}

export async function GET() {
  try {
    const now = Date.now();
    const logger = baseLogger.child({ route: 'api/twitter-news' });

    // Check if we're currently rate limited
    if (isRateLimited && now < rateLimitResetTime) {
      logger.warn('Rate limited: using cache (pre-check)', {
        retryAt: rateLimitResetTime,
      });
      recordTwitterRateLimit();

      // If we have cached data, return it
      if (tweetCache) {
        const cached = normalizeResponse(tweetCache.data);
        cached.fromCache = true;
        cached.stale = true;
        cached.lastUpdated = tweetCache.timestamp;
        cached.notice = 'Using cached data due to API rate limits';
        return NextResponse.json(cached);
      }

      // If no cache, return an error
      return NextResponse.json(
        { error: 'Twitter API is rate limited', details: { resetTime: rateLimitResetTime } },
        { status: 429 }
      );
    }

    // If rate limit has expired, reset the flag
    if (isRateLimited && now >= rateLimitResetTime) {
      isRateLimited = false;
    }

    // Check if we should fetch new tweets
    if (!shouldFetchNewTweets() && tweetCache) {
      logger.info('Using cached tweets within TTL window');
      const cached = normalizeResponse(tweetCache.data);
      cached.fromCache = true;
      cached.stale = false;
      cached.lastUpdated = tweetCache.timestamp;
      return NextResponse.json(cached);
    }

    // Use centralized TwitterClient
    const client = new TwitterClient();
    let data: unknown;
    try {
      data = await client.searchRecent({
        query: 'from:PiCoreTeam -is:retweet',
        'tweet.fields': 'created_at,public_metrics',
        expansions: 'author_id',
        'user.fields': 'name,username,profile_image_url',
        max_results: 10,
      });
    } catch (err) {
      const logger = baseLogger.child({ route: 'api/twitter-news' });
      if (err instanceof TwitterApiError) {
        // If we hit rate limits, set the rate limit flag
        if (err.status === 429) {
          isRateLimited = true;
          const headers = err.headers ?? {};
          const retryAfterHeader = headers['retry-after'] || headers['Retry-After'];
          const resetTimeHeader = headers['x-rate-limit-reset'] || headers['X-Rate-Limit-Reset'];
          if (retryAfterHeader && !Number.isNaN(Number(retryAfterHeader))) {
            const retryAfterMs = Number(retryAfterHeader) * 1000;
            rateLimitResetTime = Date.now() + retryAfterMs;
          } else if (resetTimeHeader && !Number.isNaN(Number(resetTimeHeader))) {
            rateLimitResetTime = parseInt(String(resetTimeHeader), 10) * 1000; // ms
          } else {
            rateLimitResetTime = Date.now() + 15 * 60 * 1000; // 15m fallback
          }
          logger.warn('Twitter API 429', { retryAt: rateLimitResetTime });
          recordTwitterRateLimit();

          if (tweetCache) {
            const cached = normalizeResponse(tweetCache.data);
            cached.fromCache = true;
            cached.stale = true;
            cached.lastUpdated = tweetCache.timestamp;
            cached.notice = 'Using cached data due to API rate limits';
            cached.retryAt = rateLimitResetTime;
            return NextResponse.json(cached);
          }
        }
        // Non-429 API error
        logger.error('Twitter API error', { status: err.status });
        recordTwitterApiError();
        return NextResponse.json(
          {
            error: 'Failed to fetch tweets',
            details: err.details,
            retryAt: err.status === 429 ? rateLimitResetTime : undefined,
          },
          { status: err.status }
        );
      }

      // Non-TwitterApiError path
      logger.error('Unexpected error from TwitterClient', {
        error: err instanceof Error ? err.message : String(err),
      });
      recordTwitterApiError();
      if (tweetCache) {
        return NextResponse.json({
          ...tweetCache.data,
          fromCache: true,
          notice: 'Using cached data due to API error',
        });
      }
      return NextResponse.json(
        {
          error: 'Failed to fetch tweets',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }

    // Normalize and slice result to match UI expectations (latest + previous 9)
    const normalized = normalizeResponse(data);
    if (Array.isArray(normalized.data)) {
      normalized.data = normalized.data.slice(0, 10);
    }

    // Update the cache with normalized data
    tweetCache = {
      data: normalized,
      timestamp: now,
    };

    // Reset rate limit flag if we successfully got data
    isRateLimited = false;

    normalized.stale = false;
    normalized.lastUpdated = now;
    logger.info('Twitter fetch success', { stale: false });
    return NextResponse.json(normalized);
  } catch (error) {
    const logger = baseLogger.child({ route: 'api/twitter-news' });
    logger.error('Error fetching tweets', {
      error: error instanceof Error ? error.message : String(error),
    });
    recordTwitterApiError();

    // If we have cached data and encounter an error, return the cached data
    if (tweetCache) {
      logger.warn('Error occurred, returning cached tweets');
      const cached = normalizeResponse(tweetCache.data);
      cached.fromCache = true;
      cached.stale = true;
      cached.lastUpdated = tweetCache.timestamp;
      cached.notice = 'Using cached data due to API error';
      return NextResponse.json(cached);
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch tweets',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
