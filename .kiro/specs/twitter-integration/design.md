# Twitter Integration Design

## Architecture

- Client UI components read from internal API endpoints only; never call X directly from the browser
- API routes call `TwitterService`, which enforces rate limiting, caching, and backoff
- `TwitterService` uses `TwitterClient` (SDK wrapper) that exposes minimal, typed methods
- Redis (or pluggable CacheStore) for:
  - Response caching with TTL
  - Token-bucket global rate limiting
  - Request deduplication (single-flight)
- Background workers (BullMQ) for scheduled refresh and retry queues
- Observability: metrics (Prometheus/OpenTelemetry), structured logs, alerts

```graph
[UI Components] -> [/api/twitter/*] -> [TwitterService]
                                 |-> [CacheStore]
                                 |-> [RateLimiter]
                                 |-> [TwitterClient]
                                 '--> [Queues: refresh/retry]
```

## Component Responsibilities

- TwitterClient: minimal wrapper around X endpoints (e.g., search counts), handles auth
- RateLimiter: token-bucket; consults headers and locks when near reset
- CacheStore: get/set with TTL; cache keys by endpoint+params versioned schema
- TwitterService: orchestrates cache read-through, queuing, and backoff
- JobRunner: scheduled refresh; retry with exponential backoff and jitter

## Data Flow

1. UI requests `/api/twitter/search-counts?q=...`
2. Service checks cache; if hit, return immediately
3. If miss, check limiter; if tokens available, call X; else enqueue job and return stale-with-warning (if available)
4. On X response, update cache with value + `lastUpdated`
5. Rate-limit headers update limiter state; if error 429/420, trigger cooldown and schedule retry

## Interfaces

- TwitterClient
  - `getSearchCounts(params): Promise<SearchCountsResult>`
- TwitterService
  - `getSearchCounts(params): Promise<{data, meta: {lastUpdated, stale}}>`
- RateLimiter
  - `take(tokens: number): Promise<boolean>`
  - `cooldownUntil(unixTs: number): Promise<void>`
- CacheStore
  - `get<T>(key: string): Promise<T | null>`
  - `set<T>(key: string, value: T, ttlSec: number): Promise<void>`

## State Management Strategy

- On the client, store `data` + `meta.stale` + `meta.lastUpdated`
- Show subtle banner when stale; auto-refresh when new data arrives

## Backoff Strategy

- Exponential backoff with full jitter: `sleep = random(0, base * 2^attempt)`
- Respect `x-rate-limit-reset` epoch when provided

## Security

- Server-only bearer token via env var; never expose to client
- Input validation and output sanitization; avoid echoing raw Twitter content

## Degradation

- Serve last-known cached value with `stale=true`
- Hide features if no cached value exists and rate-limit persists, with clear messaging
