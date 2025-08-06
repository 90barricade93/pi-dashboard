---
description: Repository Information Overview
---

# Repository Information Overview

Generated: 2025-08-06 18:07 local
Repository: pi-dashboard

## Summary

- Purpose:
  - Modern, performant dashboard to monitor Pi Network price, news, and network stats.
  - Provides simple calculator and lightweight forecasting from historical data.
- Key features:
  - Real-time price tracking via OKX
  - Basic price prediction from historical candles
  - Pi value calculator
  - News feed (Pi Network/Twitter integration intent noted)
  - Dark/light theme, responsive UI, a11y considerations
- Status: Not explicitly stated; appears alpha/beta

## Tech Stack

- Frontend: Next.js 15 (App Router), React 18, Tailwind CSS, Radix UI primitives
- Backend: Not applicable (consumes external OKX API)
- Languages: TypeScript 5
- Tooling: ESLint 9, Prettier 3, Jest 29 (unit), Playwright (e2e), Husky, lint-staged

## Architecture & Flow

- Frontend routing/pages:
  - Next.js App Router with `app/page.tsx` as the main dashboard.
- Core modules:
  - `components/*`: Feature widgets (price tracker, prediction, news, stats, calculator) and UI primitives in `components/ui`.
  - `lib/okx-client.ts`: OKX API client with HMAC signing; price and historical data fetch.
  - `lib/api-client.ts`: Thin wrapper exposing fetch helpers and fallbacks.
  - `contexts/currency-context.tsx`: Currency selection/provider.
  - `hooks/*`: UI and toast utilities.
- State management:
  - Local component state + `CurrencyProvider` context; no global store.
- Backend API:
  - None in-repo; calls OKX endpoints:
    - GET `/api/v5/market/ticker?instId=PI-USDT` (latest price)
    - GET `/api/v5/market/candles?instId=PI-USDT&bar=1D&limit=<days>` (historical)

## Key Directories & Files

- `app/`: Next.js app router entry (`layout.tsx`, `page.tsx`, `globals.css`)
- `components/`: Dashboard feature components and `ui/` primitives
- `lib/okx-client.ts`: Signed client for OKX ticker/candles + currency conversion
- `lib/api-client.ts`: Facade for price and history with error handling
- `contexts/currency-context.tsx`: Currency context provider
- `hooks/`: Utility hooks (`use-toast`, `use-mobile`)
- `__tests__/`: React component tests + test utilities
- `tailwind.config.ts`, `postcss.config.mjs`: Styling configuration
- `next.config.mjs`: Security headers, experimental perf flags
- `jest.config.js`, `jest.setup.js`: Jest config and setup
- `playwright.config.ts`: E2E configuration
- `Dockerfile`: Container build definition
- `.env.example`: Environment variables template (content not readable)
- `README.md`: Project overview, scripts, setup

## Frontend Overview

- Commands:
  - `npm run dev` — start dev server
  - `npm run build` — production build
  - `npm start` — start production server
  - `npm run lint`, `npm run lint:fix`
  - `npm run format`, `npm run format:check`
  - `npm run type-check`
  - `npm run validate` — lint + format check + type-check
  - `npm test` — Jest tests
  - `npm run test:e2e` — Playwright tests
- Important components/pages:
  - `app/page.tsx`: Main dashboard composition
  - `components/price-tracker.tsx`: Live PI price display
  - `components/price-prediction.tsx`: Forecast UI using historical data
  - `components/news-feed.tsx`: News/Twitter feed
  - `components/network-stats.tsx`: Network metrics
  - `components/pi-calculator.tsx`: Value calculator
  - `components/theme-toggle.tsx`, `components/theme-provider.tsx`, `components/header.tsx`, `components/footer.tsx`
- Styling/UI: Tailwind CSS with Radix UI primitives, `tailwindcss-animate`, `lucide-react`

## Backend Overview (if applicable)

- Runtime: Not applicable
- Start/dev: Not applicable
- Notable endpoints (high-level): Not applicable

## Data & Persistence

- Data sourced from OKX REST API at runtime (client/server depending on usage).
- No database; ephemeral in-memory state within components/context.

## Testing

- Framework: Jest (unit, jsdom) and Playwright (e2e)
- How to run:
  - `npm test` (unit), `npm run test:e2e` (e2e)
- Coverage focus: Configured for global thresholds (80% branches/functions/lines/statements)

## Build, Run, Deploy

- Prereqs:
  - Node 20.x, npm 10.x (per README)
- Local dev:
  - `npm install && npm run dev`
- Production build/deploy:
  - `npm run build && npm start`
  - Next.js standalone output enabled; `Dockerfile` present
  - README suggests Vercel deployment

## Risks, Gaps, TODOs

- Environment variables (OKX_API_KEY/SECRET/PASSPHRASE) required; ensure set in deployment (e.g., Vercel) and dev.
- Currency conversion uses additional OKX ticker fetches with fallback hardcoded rates; verify pair availability and accuracy.
- News/Twitter integration may require Twitter API credentials; ensure rate limiting and error handling.
- `.env` and `.env.example` contents could not be read here; confirm required variable names and docs.
- Security headers are set in Next config; verify compatibility with hosting (e.g., Vercel) and static assets.

## Navigation Tips

- Start at: `app/layout.tsx`, `app/page.tsx`
- Edit UI at: `components/*` and `components/ui/*`
- Business logic at: `lib/okx-client.ts`, `lib/api-client.ts`
- Configs at: `next.config.mjs`, `tailwind.config.ts`, `jest.config.js`, `tsconfig.json`

---
Appendix

Small tree snapshot:

- `app/`
  - `layout.tsx`
  - `page.tsx`
  - `globals.css`
- `components/`
  - `price-tracker.tsx`
  - `price-prediction.tsx`
  - `news-feed.tsx`
  - `network-stats.tsx`
  - `pi-calculator.tsx`
  - `ui/` (Radix-based primitives)
- `lib/`
  - `okx-client.ts`
  - `api-client.ts`
- `contexts/currency-context.tsx`
- `__tests__/`
  - `header.test.tsx`, `footer.test.tsx`, `layout.test.tsx`, utils
