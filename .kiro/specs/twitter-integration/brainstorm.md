# Twitter Integration Brainstorm

## Problem

Twitter/X API calls are being rate limited (e.g., retry after ~240 minutes), causing stale data in the dashboard and poor UX.

## Ideas

- Centralize all Twitter API calls in a server-side TwitterService; no direct client calls
- Respect rate-limit headers (`x-rate-limit-remaining`, `x-rate-limit-reset`) and implement exponential backoff with jitter
- Introduce a token-bucket rate limiter (Redis) to prevent bursts across the whole app
- Add a cache layer (Redis) with sensible TTLs; UI reads from cache; background jobs refresh
- Move data retrieval to scheduled jobs (cron) and queue workers (BullMQ) to prefetch and hydrate cache
- Batch and deduplicate requests; use data fan-out to serve multiple consumers from one API call
- Use lower-cost endpoints (counts/summary) where possible; avoid per-user timelines
- Implement feature flag to degrade gracefully (show last-known data + “last updated”)
- Add observability (metrics + logs + alerts) on rate-limit events and hit ratios
- Consider alternate providers where permissible (e.g., GDELT/news sentiment); avoid scraping that violates ToS
- Evaluate paid tier limits; if necessary, pool accounts via allowed enterprise mechanisms (comply with ToS)

## Users & Stories

- As a viewer, I want fresh sentiment/metrics without downtime, so I can trust the dashboard
- As an operator, I want alerts before outages and visibility into rate-limit pressure

## Technical Constraints

- Windows dev environment; Node/React/Astro stack in this repo
- Must comply with X API ToS; no scraping
- Network latency and third-party failures

## Success Criteria

- 0 production hard failures due to X rate limits in normal usage
- 99th percentile freshness < 10 minutes (configurable per feature)
- Clear, user-friendly degradation and recovery behavior
- Alert before exhaustion of rate budget

## Open Questions

- Which X endpoints are in use today (read-only? counts? search?)
- Current API tier/limits?
- Multi-tenant/user-specific tokens or app-only bearer?
- Expected freshness per widget?
- Is Redis available? If not, preferred cache (Upstash, local memory with eviction)?
