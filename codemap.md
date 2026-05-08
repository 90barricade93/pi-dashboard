# Pi Dashboard — Codemap

A structural overview of the `pi-dashboard` codebase: directories, modules, routes, and how data flows through the app.

## Project Overview

- **Name:** `pi-dashboard` (v1.0.1)
- **Description:** Modern, performant, and secure dashboard for monitoring Pi Network statistics, prices, and news.
- **Framework:** Next.js 15.2.2 (App Router) · React 18.2.0 · TypeScript 5.3.3 (strict)
- **UI:** shadcn/ui (Radix primitives) · Tailwind CSS 3.4.1 · `next-themes`
- **Charts:** Recharts 2.15.0 (with custom responsive + a11y wrappers)
- **Forms/Validation:** react-hook-form · Zod
- **Testing:** Jest 29 + @testing-library · Playwright 1.42 (5 browsers/devices)
- **Tooling:** ESLint · Prettier · Husky · lint-staged · Docker (Node 20 Alpine)

### Scripts (package.json)

| Script | Purpose |
|---|---|
| `dev` | Next.js dev server |
| `build` / `start` | Production build / serve |
| `lint` / `lint:fix` | ESLint |
| `format` / `format:check` | Prettier |
| `type-check` | TypeScript |
| `validate` | All quality checks |
| `test` / `test:e2e` | Jest unit · Playwright E2E |

## Top-Level Layout

```
pi-dashboard/
├── app/                  # Next.js App Router (pages + API routes)
├── components/           # Feature + layout components, shadcn/ui library
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # API clients, business logic, utilities
├── types/                # Shared TypeScript types
├── styles/               # Global CSS (Tailwind + theme tokens)
├── public/               # Static assets
├── __tests__/            # Jest unit + integration tests
├── docs/                 # Project documentation
├── examples/             # Standalone example scripts
└── Configuration         # next, tailwind, jest, playwright, docker, etc.
```

## Routes

### Pages (`app/`)

| Path | File | Purpose |
|---|---|---|
| / | `app/page.tsx` | Main dashboard — `CurrencyProvider`, `PriceTracker`, `NetworkStats`, `PricePrediction`, `NewsFeed`, `PiCalculator` |
| (root) | `app/layout.tsx` | Root layout — `ThemeProvider`, `Header`, `Footer`, `MobileNav`, `CurrencyProvider` |

### API (`app/api/`)

| Method · Path | File | Purpose |
|---|---|---|
| `GET /api/metrics` | `app/api/metrics/route.ts` | Telemetry counters + rate-limit alerting status |
| `GET /api/twitter-news` | `app/api/twitter-news/route.ts` | Cached Pi-related tweets (Twitter v2, 4h TTL) |

## Components (`components/`)

### Feature components

| File | Responsibility |
|---|---|
| `price-tracker.tsx` | Real-time Pi price from OKX, currency selector, change vs. previous |
| `price-prediction.tsx` | Recharts forecasting chart (1D/1W/1M/3M/6M/1Y) — responsive, accessible |
| `network-stats.tsx` | Network metrics (active users, nodes, block height, TPS, consensus) |
| `news-feed.tsx` | Aggregated news + Twitter cards, category tabs |
| `pi-calculator.tsx` | Pi ↔ fiat conversion using current price + selected currency |

### Layout components

| File | Responsibility |
|---|---|
| `header.tsx` | Desktop nav, dropdown menu, theme toggle |
| `footer.tsx` | Page footer (links, metadata) |
| `mobile-nav.tsx` | Mobile drawer navigation |
| `theme-provider.tsx` | `next-themes` wrapper |
| `theme-toggle.tsx` | Light/dark switcher |

### `components/ui/` — shadcn/ui library (~60 files)

Primitives & compositions: `button`, `input`, `label`, `textarea`, `badge`, `avatar`, `separator`, `checkbox`, `radio-group`, `switch`, `toggle`, `accordion`, `collapsible`, `tabs`, `alert`, `alert-dialog`, `dialog`, `drawer`, `dropdown-menu`, `context-menu`, `navigation-menu`, `menubar`, `popover`, `hover-card`, `tooltip`, `breadcrumb`, `pagination`, `carousel`, `progress`, `slider`, `scroll-area`, `select`, `command`, `calendar`, `input-otp`, `sheet`, `sidebar`, `resizable`, `aspect-ratio`, `table`, `form`, `card`, `skeleton`, `chart` (Recharts wrapper), `toast`, `toaster`, `sonner`, plus hooks `use-toast.ts`, `use-mobile.tsx`.

## Contexts (`contexts/`)

| File | Provides |
|---|---|
| `currency-context.tsx` | `CurrencyProvider` + `useCurrency()` — selected currency (EUR/USD/GBP/JPY/RUB) for all price views |

## Hooks (`hooks/`)

| File | Purpose |
|---|---|
| `use-chart-accessibility.tsx` | Keyboard nav + screen-reader hooks for charts |
| `use-mobile.tsx` | Media-query hook for responsive breakpoints |
| `use-toast.ts` | Toast notification wrapper |

## Library (`lib/`)

### API & data clients

| File | Purpose |
|---|---|
| `api-client.ts` | OKX wrapper with fallback prices |
| `okx-client.ts` | OKX REST client — price fetch, caching, rate limiting |
| `twitter-client.ts` | Twitter API v2 client — search, normalization |
| `twitter-service.ts` | Service layer — fetch + filter tweets |

### Charting & formatting

| File | Purpose |
|---|---|
| `price-formatter.ts` | Currency formatting, space-responsive text |
| `chart-responsive.ts` | Responsive chart metrics (padding, grids) |
| `chart-accessibility.ts` | ARIA labels, keyboard navigation |
| `chart-performance.ts` | Render-optimization helpers |
| `time-label-manager.ts` | Adaptive axis labels, intervals, transitions |

### Cross-cutting

| File | Purpose |
|---|---|
| `metrics.ts` | Telemetry + rate-limit counters |
| `rate-limiter.ts` | Generic rate-limit utilities |
| `cache-store.ts` | In-memory caching layer |
| `logger.ts` | Structured logging |
| `utils.ts` | `cn()` and small shared helpers |

## Types (`types/`)

- `chart-responsive.ts` — exports for responsive chart utilities.

## Styles (`styles/`)

- `globals.css` — Tailwind base + CSS variables (light + dark themes).

## Tests (`__tests__/`)

**Unit / utility:** `chart-accessibility`, `chart-performance`, `chart-responsive`, `price-formatter`, `time-label-manager`, `metrics`, `twitter-client`, `twitter-service`, `cache-and-rate`, `accessibility-integration`, `font-sizing`.

**Hooks:** `use-chart-accessibility.test.tsx`.

**Components:** `header.test.tsx`, `footer.test.tsx`, `layout.test.tsx`.

**Layout/visual:** `collision-resolution`, `dynamic-padding`, `font-sizing`.

**Helpers:** `setup.ts`, `test-utils.tsx`.

## Configuration

| File | Role |
|---|---|
| `tsconfig.json` | Strict TS, `@/*` path alias, ES2020 |
| `next.config.mjs` | Standalone output, security headers, experimental flags |
| `tailwind.config.ts` | Dark mode, theme tokens, animations |
| `postcss.config.mjs` | Tailwind + Autoprefixer |
| `jest.config.js` / `jest.setup.js` | Unit testing, 80% coverage threshold |
| `playwright.config.ts` | E2E across Chrome/Firefox/Safari + Pixel 5 / iPhone 12 |
| `eslint.config.{js,mjs}` | TS + React + Hooks rules |
| `components.json` | shadcn/ui CLI config |
| `Dockerfile` | Multi-stage Node 20 Alpine build |

## State & Data Flow

1. **Currency selection** lives in `CurrencyContext` (global) — consumed by price components.
2. **Local UI state** uses `useState` per component (loading, errors, timestamps).
3. **Price data:** components → `api-client.ts` → `okx-client.ts` (cache 1–5 min, 5-min cooldown on 429) → fallback prices.
4. **News data:** `/api/twitter-news` → `twitter-service.ts` → `twitter-client.ts` (4 h cache, max 3 tweets/req).
5. **Telemetry:** clients write counters to `metrics.ts`; `/api/metrics` exposes them with alerting flags.
6. **Presentation:** `price-formatter` + `chart-responsive` + `chart-accessibility` shape the rendered output.

No Redux/Zustand — React Context + hooks only.

## External Integrations

| Service | Used For | Auth | Cache |
|---|---|---|---|
| OKX | Spot prices for Pi | `OKX_API_KEY`, `OKX_API_SECRET`, `OKX_PASSPHRASE` | 1–5 min |
| Twitter v2 | Recent Pi mentions | `TWITTER_BEARER_TOKEN` | 4 hours |

## Docs & Examples

- `docs/twitter-inventory.md` — Twitter integration notes.
- `examples/padding-demo.ts` — Padding calculation demo.
- `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` at repo root.
- `testing-report.tsx` — testing summary report.
