# Twitter Integration Code Reference

## Overview

Server-side service layer mediates all interactions with the Twitter/X API, enforcing rate limits, caching, and graceful degradation for UI.

## Components

### TwitterClient

**File**: `lib/twitter-client.ts`
**Purpose**: Minimal, typed wrapper around X endpoints in use
**Props/Config**: `TWITTER_BEARER_TOKEN` env var
**Usage**: `const client = new TwitterClient(process.env.TWITTER_BEARER_TOKEN!)`

### CacheStore

**File**: `lib/cache-store.ts`
**Purpose**: Get/Set with TTL; Redis preferred, memory fallback

### RateLimiter

**File**: `lib/rate-limiter.ts`
**Purpose**: Token bucket; respect headers and cooldown on 429

### TwitterService

**File**: `lib/twitter-service.ts`
**Purpose**: Orchestrates cache-first, backoff, cooldown, stale responses

### API Routes

**File**: `pages/api/twitter/*.ts`
**Purpose**: Expose internal endpoints (e.g., search counts)

## Utilities

### Logger

**File**: `lib/logger.ts`
**Purpose**: Structured logs with levels and context

### Metrics

**File**: `lib/metrics.ts`
**Purpose**: Counters for rate-limit hits, cache hits/misses

## Patterns

### Stale-While-Revalidate with Fallback

**Description**: Return cached data when external API unavailable; refresh in background
**Implementation**: Cache read -> limiter -> fetch -> cache set -> return; on failure, return cached + `stale=true`

## Common Issues

### Rate Limit Exhaustion

**Symptoms**: 429/420 responses; long retry windows
**Solution**: Serve cache; set cooldown until `x-rate-limit-reset`; enqueue refresh
**Prevention**: Background prefetch, batching, limiter

## Testing

### Unit Tests

**File**: `__tests__/twitter/*.test.ts`
**Tests**: client auth, cache behavior, limiter, service orchestration

### Integration Tests

**File**: `__tests__/twitter/integration/*.spec.ts`
**Tests**: API route returns from cache when rate-limited; honors TTL and stale flag
