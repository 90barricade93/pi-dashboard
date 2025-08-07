# Twitter Usage Inventory

Last updated: 2025-08-07

## Scope

Inventory of all Twitter/X-related usage in the codebase: internal API endpoints, client call sites, external endpoints/params, and response fields consumed by the UI.

## Internal API Endpoints

- GET `/api/twitter-news`
  - File: `app/api/twitter-news/route.ts`

## Client Call Sites

- `components/news-feed.tsx`
  - Fetch: `fetch('/api/twitter-news', { cache: 'no-store', headers: { 'X-Timestamp': Date.now().toString() } })`
  - Approx. location: line ~159

## External X (Twitter) Endpoints

- GET `https://api.twitter.com/2/tweets/search/recent`
  - Query params used:
    - `query`: `from:PiCoreTeam -is:retweet`
    - `tweet.fields`: `created_at,public_metrics`
    - `expansions`: `author_id`
    - `user.fields`: `name,username,profile_image_url`
    - `max_results`: `10` (server trims to 3 items in response)
  - Auth: Bearer token from env `TWITTER_BEARER_TOKEN`

## Server Response Handling (API Route)

- File: `app/api/twitter-news/route.ts`
- Behaviors:
  - In-memory cache with 4h TTL (`tweetCache`, `timestamp`)
  - Basic rate-limit handling with flags (`isRateLimited`, `rateLimitResetTime`)
    - Uses `retry-after` or `x-rate-limit-reset` headers when present; fallback 15m
  - On 429 with cache: returns cached payload with `fromCache: true`, `notice`, `retryAt`
  - On success: returns raw Twitter v2 payload (then truncated to first 3 tweets)

## Fields Consumed by UI

- From API response (Twitter v2 + server additions):
  - `data[]`: `id`, `text`, `created_at`, `public_metrics{ like_count, retweet_count, reply_count }`, `author_id`
  - `includes.users[]`: `id`, `name`, `username`, `profile_image_url`
  - Server-added (conditional): `fromCache`, `notice`, `retryAt`

## Client-Side Local Storage Keys

- `twitter-cache`: `{ data, timestamp }` used for up to 4h
- `twitter-rate-limited`: `{ timestamp, resetTime }` stored on 429

## Other References

- README: mentions Twitter API v2 and env var `TWITTER_BEARER_TOKEN`
- Test: `__tests__/footer.test.tsx` asserts footer Twitter link href

## Notes

- Current architecture partially meets requirements: UI calls internal API, but no centralized `TwitterService`; caching is in-memory (server) + localStorage (client).
- Frequent 429s observed in console; rate limiting is basic and not token-bucket.
