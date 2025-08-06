# Twitter Integration Tasks

## start by finding out about twitter api we use on web! [ ]

## Task T1: Inventory current Twitter usage [ ]

**Requirement**: R1
**Description**: Grep for any Twitter/X usage and list endpoints/params.
**Acceptance Criteria**: Document listing endpoints and call sites.
**Estimated Time**: 1h
**Dependencies**: None
**Testing**: NA
**Files to Modify**: docs only

## Task T2: Implement TwitterClient wrapper [ ]

**Requirement**: R1
**Description**: Create typed client with auth (bearer) and minimal methods used.
**Acceptance Criteria**: Unit tests for auth and a happy-path endpoint.
**Estimated Time**: 2h
**Dependencies**: T1
**Testing**: Jest: mock fetch
**Files to Modify**: `lib/twitter-client.ts`

## Task T3: Add CacheStore (Redis) and RateLimiter [ ]

**Requirement**: R2, R3
**Description**: Implement pluggable cache (Redis first, memory fallback) and token-bucket limiter.
**Acceptance Criteria**: Tests demonstrate cache hit/miss; limiter prevents bursts.
**Estimated Time**: 3h
**Dependencies**: T2
**Testing**: Jest
**Files to Modify**: `lib/cache-store.ts`, `lib/rate-limiter.ts`

## Task T4: TwitterService orchestration [ ]

**Requirement**: R1, R2, R3
**Description**: Read-through cache, respect rate limit headers, return stale when necessary.
**Acceptance Criteria**: Integration tests for cache-first, miss-then-fetch, and 429 fallbacks.
**Estimated Time**: 3h
**Dependencies**: T2, T3
**Testing**: Jest + integration
**Files to Modify**: `lib/twitter-service.ts`

## Task T5: API routes and UI updates [ ]

**Requirement**: R6
**Description**: Add `/api/twitter/*` endpoints; update components to use them and render stale banner + lastUpdated.
**Acceptance Criteria**: Manual test shows banner when stale.
**Estimated Time**: 2h
**Dependencies**: T4
**Testing**: Playwright optional
**Files to Modify**: `pages/api/twitter/*.ts`, components

## Task T6: Observability & alerts [ ]  

**Requirement**: R5
**Description**: Structured logs, metrics counters for rate-limit hits, alert threshold config.
**Acceptance Criteria**: Counter increases under synthetic load.
**Estimated Time**: 2h
**Dependencies**: T4
**Testing**: Unit + manual
**Files to Modify**: `lib/metrics.ts`, `lib/logger.ts`

## Task T7: Background refresh jobs (optional) [ ]

**Requirement**: R4
**Description**: BullMQ worker + schedule for common queries; backoff with jitter.
**Acceptance Criteria**: Jobs populate cache periodically.
**Estimated Time**: 3h
**Dependencies**: T3, T4
**Testing**: Manual + logs
**Files to Modify**: `jobs/twitter-refresh.ts`
