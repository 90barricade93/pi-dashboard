# Twitter Integration Requirements

console :

D:\CODE\CODING DIRECTORY\Portfolio Projects\pi-dashboard\components\news-feed.tsx:159 GET http://localhost:3000/api/twitter-news 429 (Too Many Requests)
fetchNews @ D:\CODE\CODING DIRECTORY\Portfolio Projects\pi-dashboard\components\news-feed.tsx:159
NewsFeed.useEffect @ D:\CODE\CODING DIRECTORY\Portfolio Projects\pi-dashboard\components\news-feed.tsx:306

hook.js:608 Twitter API warning:
Object
overrideMethod @ hook.js:608

---

## Requirement R1: Centralized Server Access

**Priority**: High
**Category**: Integration
**Description**: All Twitter API access must go through server-side `TwitterService`; no direct browser calls.
**Acceptance Criteria**: No client-side fetch with Twitter endpoints; server logs show all calls via service.
**Dependencies**: R2, R3
**Risks**: Refactor cost

## Requirement R2: Rate Limit Enforcement

**Priority**: High
**Category**: Non-functional
**Description**: Implement token-bucket limiter with respect to Twitter headers; cooldown on 429.
**Acceptance Criteria**: Under load, limiter prevents exceeding limits; test simulates 429 and shows cooldown respected.
**Dependencies**: R5
**Risks**: Misconfigured limits may underutilize quota

## Requirement R3: Cache with Stale-While-Revalidate

**Priority**: High
**Category**: Functional
**Description**: Cache responses in Redis with TTL; return cached data when rate-limited and flag as `stale=true`.
**Acceptance Criteria**: When Twitter is unavailable or rate-limited, API returns cached payload with `stale=true` and `lastUpdated`.
**Dependencies**: R1
**Risks**: Staleness communicated poorly to users

## Requirement R4: Background Refresh

**Priority**: Medium
**Category**: Functional
**Description**: Use a job queue to refresh popular queries on a schedule; backoff on failures.
**Acceptance Criteria**: Jobs run on schedule; metrics show refresh success rate > 95%.
**Dependencies**: R2, R3
**Risks**: Worker reliability

## Requirement R5: Observability & Alerts

**Priority**: Medium
**Category**: Non-functional
**Description**: Log structured events for rate-limit hits; expose metrics; alert when remaining quota < threshold.
**Acceptance Criteria**: Dashboards and alerts exist; synthetic tests trigger warnings.
**Dependencies**: None
**Risks**: Noise from alerts

## Requirement R6: Graceful Degradation UI

**Priority**: Medium
**Category**: UI
**Description**: Show last update time and a subtle stale banner when data is not fresh.
**Acceptance Criteria**: Visual indicator appears only when `stale=true`.
**Dependencies**: R3
**Risks**: UX clarity

## Requirement R7: Configurable Freshness per Widget

**Priority**: Low
**Category**: Functional
**Description**: Each widget defines acceptable TTL; service uses per-endpoint defaults with overrides.
**Acceptance Criteria**: Config file exists; tests verify fallback behavior.
**Dependencies**: R3
**Risks**: Over-configuration
