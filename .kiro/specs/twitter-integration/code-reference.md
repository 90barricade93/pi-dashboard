# Twitter Integration Code Reference

## Overview

Server-side service layer mediates all interactions with the Twitter/X API, enforcing rate limits, caching, and graceful degradation for UI.

## Components

### TwitterClient

**File**: `lib/twitter-client.ts`
**Purpose**: Minimal, typed wrapper around X endpoints in use
**Config/Options**:

- `bearerToken?`: defaults to `process.env.TWITTER_BEARER_TOKEN`
- `baseUrl?`: defaults to `https://api.twitter.com/2`
- `fetchFn?`: defaults to `globalThis.fetch` (polyfilled in Jest)

**Usage**:

```ts
// default env-based config
const client = new TwitterClient();

// explicit injection (useful in tests)
const clientWithMocks = new TwitterClient({
  bearerToken: 'test',
  baseUrl: 'https://api.twitter.com/2',
  fetchFn: mockFetch,
});
```

### CacheStore

**File**: `lib/cache-store.ts`
**Purpose**: Get/Set with TTL; Redis preferred, memory fallback

### RateLimiter

**File**: `lib/rate-limiter.ts`
**Purpose**: Token bucket; respect headers and cooldown on 429

### TwitterService

**File**: `lib/twitter-service.ts`
**Purpose**: Orchestrates read-through cache, local rate limiting, and stale fallbacks on errors/429.

**Behavior**:

- Cache-first only until the first successful fetch.
- After first success: attempt network each call (subject to local token-bucket limiter).
- On limiter block or Twitter API error (including 429): return last known good data with `stale: true`, `fromCache: true`, `notice`, and `retryAt` when available (from `Retry-After` or `X-Rate-Limit-Reset`).
- On fresh success: cache value, update last known good, slice tweets to configured count.

**Config defaults**:

- `cacheKey`: `twitter:pi-recent`
- `ttlMs`: 4 hours
- `sliceCount`: 3

### API Routes

**File**: `app/api/twitter-news/route.ts`
**Purpose**: Expose normalized recent tweets for the UI.

**Normalization contract**:

- Always returns an object shaped like Twitter v2 Recent Search:
  - `data`: `Tweet[]` (array, possibly empty)
  - `includes.users`: `User[]` (array, possibly empty)
- Slices `data` to 3 items.
- On cache/limiter/error paths, may include: `fromCache`, `stale`, `notice`, `retryAt`, `lastUpdated`.

## Utilities

### Logger

**File**: `lib/logger.ts`
**Purpose**: Structured logs with levels and context

### Metrics

**File**: `lib/metrics.ts`
**Purpose**: Counters for rate-limit hits, cache hits/misses

## Patterns

### Stale-While-Revalidate with Fallback

**Description**: Return cached data when external API unavailable; refresh opportunistically.
**Implementation**:

- Before first success: cache-first if present.
- Thereafter: limiter -> fetch -> cache set -> return fresh.
- On limiter block or error/429: return last known good (or cached) with `stale: true` and `retryAt` when available.

## Common Issues

### Rate Limit Exhaustion

**Symptoms**: 429/420 responses; long retry windows
**Solution**: Serve cache; set cooldown until `x-rate-limit-reset`; enqueue refresh
**Prevention**: Background prefetch, batching, limiter

## Testing

### Unit Tests

**Files**:

- `__tests__/twitter-service.test.ts`

**Covers**:

- Cache-first when cache present before first success
- Miss then fetch stores cache and returns fresh
- 429 returns stale with `retryAt`
- Local limiter blocks and returns stale

**Setup**:

- `jest.setup.js` polyfills `globalThis.fetch` defensively for tests.

### Integration Tests

**Status**: TBD
**Targets**:

- `app/api/twitter-news/route.ts` returns normalized shape
- Stale banner and `lastUpdated` propagation to UI
