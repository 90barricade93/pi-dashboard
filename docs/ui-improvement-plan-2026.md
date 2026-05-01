# UI-verbeterplan pi-dashboard — anno mei 2026

**Doel**: dashboard moderniseren met React 19 / Next.js 16 / Tailwind v4-conforme patronen en 2026-crypto-UX-conventies, zonder de werkende functionaliteit te breken.

**Niet-doel**: feature-uitbreiding (geen nieuwe widgets, geen AI-sentiment, geen voice). Alleen bestaande functionaliteit beter presenteren.

---

## 1. Context & uitgangspunten

De codebase staat op Next.js 15.2 + React 18 + Tailwind 3.4 + Radix UI + Recharts (ongebruikt) + Sonner (ongebruikt) + handgeschreven Canvas-chart (1034 r). Per mei 2026 zijn React 19, Next.js 16 en Tailwind v4 alle drie stable en zijn de migratie-tools volwassen ([React 19](https://react.dev/blog/2024/12/05/react-19), [Next 16](https://nextjs.org/blog/next-16), [Tailwind v4](https://tailwindcss.com/docs/upgrade-guide)). De refactor uit branch `claude/analyze-codebase-quality-wNvtF` heeft de codebase al opgeschoond (logger, gedeelde utils, OKX-client geconsolideerd), wat dit UI-werk eenvoudiger maakt.

**Principes**:

- Zichtbaar gedrag blijft hetzelfde tenzij een fase expliciet UX-wijziging definieert.
- Hergebruik bestaande utilities: `lib/logger.ts`, `lib/currency-symbols.ts`, `components/powered-by-okx.tsx`, `components/ui/sonner.tsx`, `lucide-react`, `tailwindcss-animate`.
- Per fase: `npm run validate` groen + handmatige walkthrough op desktop en mobile-emulator.
- Buiten scope: `lib/time-label-manager.ts` blijft onaangetast tenzij Tier 3 #9 (chart-vervanging) uitgevoerd wordt — pas dán verdwijnt het.

---

## 2. Huidige UI-staat (compact)

| Aspect        | Huidige situatie                                                                                                | Probleem                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Iconen        | Mix van `lucide-react` (news-feed) en functionele emoji `🔄 ⚠️ 👥 🌐 ⚡ ↗️↘️ 📈📉`                              | Inconsistent, niet-tonable, niet-themeable                                     |
| Loading       | Skeleton (news-feed) + emoji-spinner `🔄 animate-spin` (alle andere)                                            | Twee patronen voor één doel                                                    |
| Chart         | `components/price-prediction.tsx` 1034 r handgeschreven Canvas 2D + 3 ondersteunende `lib/chart-*.ts` (~1280 r) | Onderhoudsschuld; Recharts is dependency maar ongebruikt                       |
| Real-time     | `setInterval(getPiPrice, 30_000)` polling                                                                       | OKX biedt WebSocket; polling = jitter + onnodig serverlast                     |
| Toasts        | `sonner` als dependency, `components/ui/sonner.tsx` aanwezig, **0 callers**, geen `<Toaster />` mount           | Hele feedback-laag dood                                                        |
| `aria-live`   | `lib/chart-accessibility.ts` heeft `LiveRegionManager`, alleen voor charts                                      | Live prijs in `price-tracker.tsx:118` is niet aangekondigd voor screen readers |
| Mobile-header | `app/layout.tsx:32-41` toont alleen π-logo + drawer-trigger                                                     | Geen theme-toggle of currency-knop bereikbaar zonder drawer te openen          |
| Motion        | `tailwindcss-animate` (pulse, spin)                                                                             | Currency-switch en tab-wissel zijn abrupt; geen view-transitions               |
| Theme-tokens  | HSL CSS vars in `app/globals.css:27-96`, dubbel gedefinieerd in `tailwind.config.ts:24-86`                      | Tailwind v4 wil `@theme`-directive (single source)                             |
| Container     | Vaste viewport-breakpoints `md:`/`lg:` op grid                                                                  | Widgets reageren niet op hun grid-cel-breedte                                  |

---

## 3. Gefaseerd plan

Acht fases, oplopend in invasiviteit. Tier 1 (fases 1-4) is een halve dag werk; Tier 2 (5-7) twee dagen; Tier 3 (fases 8-10) drie tot vier dagen. Tier 4 (11-12) is optioneel/strategisch en niet gepland.

### Fase 1 — Iconen consistent maken (2-3 u, ~0 risico)

**Bevinding**: emoji als functioneel icoon op:

- `components/price-tracker.tsx:114` (`🔄`), `:135` (`↗️`), `:137` (`↘️`), `:152` (`⚠️`)
- `components/network-stats.tsx:70` (`🔄`), `:77` (`👥`), `:85` (`🌐`), `:103` (`⚡`)
- `components/price-prediction.tsx`: `🔄`, `📈`, `📉`, `➖`, `⚠️` (zoek met `grep -n`)
- `components/theme-toggle.tsx`: `☀️`, `🌙`, `🖥️` (acceptabel als visueel anker, maar minder consistent dan lucide)

**Edits**:

- `lucide-react` heeft alle equivalenten: `RefreshCw`, `ArrowUp`, `ArrowDown`, `AlertTriangle`, `Users`, `Globe`, `Zap`, `TrendingUp`, `TrendingDown`, `Minus`, `Sun`, `Moon`, `Monitor`.
- Maak in `components/ui/icons.tsx` (nieuw) een dunne re-export van de gebruikte iconen — voorkomt verspreide imports en geeft één centrale plaats voor toekomstige icon-set wissels.
- Vervang per component één-op-één. Behoud bestaande `aria-hidden` patroon op SVG-iconen.

**Verificatie**: `npm run type-check` + visuele check dat `RefreshCw` met `animate-spin` correct draait.

**Risico**: lucide-iconen zijn kleiner dan emoji. Eventueel `size-5` (20 px) toevoegen om vergelijkbare visuele weight te krijgen.

---

### Fase 2 — Loading-states uniformeren op `Skeleton` (2 u, laag risico)

**Bevinding**: drie verschillende loading-patronen.

- `components/price-tracker.tsx:112-115` — emoji-spinner div h-24
- `components/network-stats.tsx:69-71` — emoji-spinner div h-200
- `components/price-prediction.tsx` — emoji-spinner + custom transition overlay
- `components/news-feed.tsx:472-485` — `<Skeleton>` patroon (referentie)

**Edits**:

- Maak `components/ui/widget-skeleton.tsx` (nieuw): drie varianten — `<PriceCardSkeleton />`, `<StatsCardSkeleton />`, `<ChartSkeleton />`. Elk gebruikt de bestaande `<Skeleton>` uit `components/ui/skeleton.tsx`.
- Vervang in `price-tracker.tsx`, `network-stats.tsx`, `price-prediction.tsx` de `loading ? <emoji-spinner/> : <content/>` blocks door de bijpassende skeleton-variant.

**Verificatie**: `npm run dev` → throttle netwerk in dev-tools → alle 5 widgets tonen consistent skeletons.

**Risico**: in `price-prediction.tsx` zit ook een "Updating chart..." overlay tijdens timeframe-switch (regel ~1025) — dat is niet hetzelfde als initial loading. Behouden.

---

### Fase 3 — Toast-laag wire-uppen (1-2 u, ~0 risico)

**Bevinding**: `sonner` zit in `package.json:66`, `components/ui/sonner.tsx` exporteert `<Toaster />` maar wordt nergens gemount. Alle errors verschijnen nu als inline banners (price-tracker:150, pi-calculator:128, news-feed:451).

**Edits**:

- `app/layout.tsx`: importeer `<Toaster />` uit `@/components/ui/sonner` en mount onder `<Footer />` (regel 46).
- Maak `lib/toast.ts` (nieuw): wrapper met consistente categorieën:
  ```ts
  import { toast } from 'sonner';
  export const notifyError = (msg: string, fields?: Record<string, unknown>) => {...};
  export const notifySuccess = (msg: string) => {...};
  export const notifyInfo = (msg: string) => {...};
  ```
- Vervang **niet alle** banners — alleen vluchtige fouten worden toasts (price fetch failure, currency switch error). Permanente toestanden (Twitter rate-limited, "no news available") blijven banner — dat is correct onderscheid.
- Te wijzigen call-sites: `price-tracker.tsx:46-47` (banner blijft, voeg toast toe op transitie van OK→fail), `pi-calculator.tsx`-error path.

**Verificatie**: `npm run dev` → simuleer fetch-fail (block OKX domain in dev-tools) → toast verschijnt rechts-onder, verdwijnt na 5s.

**Risico**: dubbele feedback (banner + toast) bij dezelfde fout is verwarrend. Zorg voor strikte regel: banner = persistente staat, toast = transitie/event.

---

### Fase 4 — `aria-live` voor live data (30 min, ~0 risico)

**Bevinding**: prijs-tracker update elke 30s (`price-tracker.tsx:75-77`) maar wijzigingen worden niet aangekondigd voor screen readers. `lib/chart-accessibility.ts` heeft een `LiveRegionManager` maar wordt alleen door de chart gebruikt.

**Edits**:

- `components/price-tracker.tsx`: wrap de prijs-display (regel 118-121) in `<div aria-live="polite" aria-atomic="true">` zodat alleen het volledige nieuwe getal wordt voorgelezen.
- Voeg op de "last updated"-regel (regel 158) `aria-live="off"` toe — anders wordt elke seconde getikt voorgelezen.
- `components/news-feed.tsx`: bij rate-limit countdown (regel 358-389) eveneens `aria-live="polite"` op de notice — let op dat het maar ~elke 60s een merkbare wijziging mag zijn, niet elke seconde, anders wordt de gebruiker overspoeld. Zet timer op minute-precisie voor de aria-live versie.

**Verificatie**: Schermlezer (VoiceOver/NVDA) test handmatig. Of automated: `axe-core` browser extensie voor algemene a11y-check.

**Risico**: te aggressieve `aria-live="assertive"` interrumpteert. `polite` is correcter voor prijsupdates.

---

### Fase 5 — Tailwind v3 → v4 migratie (4-6 u, midden risico)

**Bevinding**: `package.json:99` heeft `tailwindcss: 3.4.1`. Theme-tokens staan dubbel: HSL-vars in `app/globals.css:27-96` én `tailwind.config.ts:24-86` mapt ze naar Tailwind kleur-namen. v4 wil één source via `@theme`.

**Edits**:

- `npx @tailwindcss/upgrade@latest` — automatisch script handelt 90% af (klassen, postcss-config, package.json).
- Handmatig nalopen na de auto-upgrade:
  - `tailwind.config.ts` mag verdwijnen of uitkleden tot `@source` directives in CSS.
  - `app/globals.css`: bovenaan `@import "tailwindcss";` + `@theme { --color-primary: ...; }`.
  - Gradient-klassen: `bg-gradient-to-br` (header.tsx, mobile-nav.tsx, layout.tsx:35) → `bg-linear-to-br`.
  - Border zonder kleur: zoek `className="...border..."` zonder gevolgde `border-{color}` — v4 gebruikt nu `currentColor`. Voorbeelden: `components/ui/card.tsx`, `components/ui/separator.tsx` — controleer en voeg `border-border` toe waar standaard kleur verwacht werd.
- `tailwindcss-animate` werkt op v4. `eslint-plugin-tailwindcss` mogelijk niet — controleer of een v4-versie bestaat, anders tijdelijk uitschakelen.

**Verificatie**:

- `npm run validate` groen.
- Visuele check op alle 5 widgets in dark + light + system theme.
- Build-time meten (`time npm run build`); verwacht 3-10× sneller per [LogRocket Tailwind 2026 guide](https://blog.logrocket.com/tailwind-css-guide/).

**Risico** (midden):

- Browser-baseline gaat naar Safari 16.4+, Chrome 111+, Firefox 128+. Voor een Pi-dashboard met techy doelgroep is dit prima maar wel documenteren.
- Het `eslint-plugin-tailwindcss` is mogelijk nog niet v4-compatible. Dan tijdelijk uit eslint.config.js verwijderen.
- Bestaande HSL-color-variables blijven bruikbaar; geen nieuwe palette nodig in deze fase.

---

### Fase 6 — Container queries voor widget-layout (2 u, laag risico, vereist Fase 5)

**Bevinding**: `app/page.tsx:14, 21` gebruikt `md:grid-cols-2` en `lg:grid-cols-3`. Een widget weet niet hoe breed zijn cel is — alleen hoe breed het scherm is. Op een tablet in landscape (>= md) krijg je 2 kolommen, dus PriceTracker is ~360 px breed; op desktop (>= lg) zou-ie 1024 px breed kunnen zijn. Beide gebruiken nu dezelfde interne layout.

**Edits**:

- Maak `<Card>` (`components/ui/card.tsx`) standaard `@container/card` zodat kinderen `@sm/card:flex-row` kunnen gebruiken.
- In `components/price-tracker.tsx`: maak de currency-switcher (regel 96-107) op smalle cellen wrappen, op brede cellen één rij. `@xs/card:flex-wrap @md/card:flex-nowrap`.
- In `components/network-stats.tsx`: in plaats van `grid-cols-2` (regel 74) doe je `@md/card:grid-cols-2 grid-cols-1` — op smalle cellen één kolom.
- Geen viewport-breakpoints meer toevoegen aan widget-internals — alles via `@container/card`.

**Verificatie**:

- `npm run dev` → resize browser slow continuous → widgets reageren op hun eigen breedte, niet op viewport-stappen.

**Risico**: container queries zijn in v4 first-class maar kunnen interferen met bestaande `md:`/`lg:` classes. Verwijder die niet allemaal in deze fase — alleen waar `@container` wint, vervangen.

---

### Fase 7 — View Transitions + uitgebreide mobile-header (3 u, laag risico)

**Bevinding**:

- Mobile-header `app/layout.tsx:32-41` toont alleen logo + drawer-trigger. Theme-toggle en currency-knoppen zitten verstopt in drawer / verborgen op mobile.
- Currency-switch is abrupt (geen transition); tab-switch in news-feed/prediction is abrupt.

**Edits — mobile-header**:

- Trek het JSX uit `app/layout.tsx:32-41` naar nieuwe `components/mobile-header.tsx`. Voeg toe: `<ThemeToggle />` rechts naast logo, en een `<CurrencyButton />` links naast de drawer-trigger zodat valuta wisselen niet meer het openen van een drawer vereist.
- Touch-targets: minimaal 44×44 px (Apple HIG). Huidige `size-icon` button uit shadcn is 40 px → expliciet `min-h-11 min-w-11`.

**Edits — view transitions**:

- Wrap `setCurrency()` in `contexts/currency-context.tsx` met:
  ```ts
  const setCurrencyAnimated = (c: Currency) => {
    if (!document.startViewTransition) return setCurrency(c);
    document.startViewTransition(() => setCurrency(c));
  };
  ```
- In `components/news-feed.tsx` en `components/price-prediction.tsx`: bij tab-switch (`onValueChange`) idem.
- CSS: voeg in `app/globals.css` (of v4-`@theme`-CSS) `::view-transition-old(*) { animation-duration: 200ms; }` toe voor zachte fade-cross. Geen library nodig.

**Verificatie**:

- Mobile in DevTools → header heeft 3 elementen, alle tappable, theme-wissel werkt.
- Currency-switch toont 200 ms cross-fade in Chromium-browsers; oudere browsers fall-back naar instant (graceful degradation).

**Risico**: View Transitions API werkt niet in alle browsers (Firefox kreeg het pas in 2025). Zonder `document.startViewTransition` is gedrag identiek aan nu — geen regressie.

---

### Fase 8 — Canvas-chart vervangen door `lightweight-charts` (2-3 dagen, hoog risico, hoog rendement)

**Bevinding**: `components/price-prediction.tsx` is 1034 r handgeschreven Canvas-rendering, plus support-modules `lib/chart-responsive.ts` (500), `lib/chart-accessibility.ts` (444), `lib/chart-performance.ts` (336), `lib/time-label-manager.ts` (917) = ~2230 r ondersteuning. Recharts is dependency maar ongebruikt. [TradingView lightweight-charts](https://github.com/tradingview/lightweight-charts) is industriestandaard voor crypto, 45 kB gzipped, native real-time `update()` API, candlestick + line + volume.

**Beslispunt vooraf**: Recharts (declarative React) of lightweight-charts (imperative)?

- Recharts past beter bij React-stijl maar mist candlestick out-of-the-box; rendering minder snel bij hoge update-frequentie.
- Lightweight-charts heeft betere perf voor real-time, native crypto-features, maar is imperative (refs nodig).
- **Advies**: lightweight-charts. De dataset is 100+ punten, polling/WS-update frequentie is hoog, en candlesticks zijn een logische volgende stap. Recharts blijft bruikbaar voor toekomstige niet-tijdseries widgets.

**Edits**:

- `npm uninstall recharts` (ongebruikt — bevestig met `grep -rln "recharts" --include="*.tsx" --include="*.ts" /home/user/pi-dashboard | grep -v node_modules`).
- `npm install lightweight-charts@latest`.
- Maak `components/price-chart.tsx` (nieuw): React-component die `useRef` op een div houdt, `useEffect` initialiseert chart, exposeert `useImperativeHandle` om `update(point)` aan te roepen. ~150 regels.
- Maak `components/price-prediction-card.tsx` (nieuw): orchestreert data-ophaling (uit huidige `price-prediction.tsx`), rendert `<PriceChart />` + de prediction-stats UI eromheen. ~250 regels.
- Verwijder `components/price-prediction.tsx` (1034 r) na migratie.
- Verwijder `lib/chart-responsive.ts`, `lib/chart-accessibility.ts`, `lib/chart-performance.ts`, `lib/time-label-manager.ts` — vervangt door lightweight-charts ingebouwde features.
- Verwijder `hooks/use-chart-accessibility.tsx` (300 r) — lightweight-charts heeft eigen ARIA-laag.
- Verwijder bijbehorende tests: `__tests__/chart-{accessibility,performance,responsive}.test.ts`, `time-label-manager.test.ts`, `collision-resolution.test.ts`, `dynamic-padding.test.ts`, `font-sizing.test.ts`, `accessibility-integration.test.ts`, `use-chart-accessibility.test.tsx` (~3000 r aan tests).

**Verificatie**:

- Hele chart-bedrading uitvoerig handmatig testen op 5 timeframes (30min/1h/2h/6h/12h), 5 currencies, theme-switch tijdens display.
- Snapshot van pre-/post-rendering bewaren: chart moet visueel vergelijkbaar zijn (lijn, kleur, prediction-band).
- Performance: meet rendering-tijd; verwacht meetbare verbetering bij real-time updates.

**Risico** (hoog):

- ~3000 regels handgeschreven a11y-/responsive-/performance-utilities verdwijnen. Lightweight-charts heeft ARIA maar minder rijk dan jullie eigen `LiveRegionManager` voor data-points. Acceptabel voor een hobby-dashboard, niet voor enterprise.
- TradingView Lightweight Charts is open-source onder Apache-2.0 met "TradingView" attribution-vereiste. Lees licentievoorwaarden.
- Prediction-overlay (dashed lines + confidence band) moet naar lightweight-charts' `addLineSeries()` met dashed style + `addAreaSeries()` voor band. Vergelijkbaar haalbaar maar wel werk.

**Rationale**: dit is de grootste enkele winst in het hele plan. Removes ~30% van de codebase, vervangt eigen onderhoud door geteste industry-lib, en maakt fase 9 (WebSocket) triviaal omdat lightweight-charts native real-time `update()` heeft.

---

### Fase 9 — OKX WebSocket voor real-time prijs (1 dag, midden risico, vereist Fase 8)

**Bevinding**: `components/price-tracker.tsx:79` polled elke 30s; `price-prediction.tsx` polled bij timeframe-wissel. OKX biedt [public WebSocket](https://www.okx.com/docs-v5/en/#websocket-api-public-channel-tickers-channel) op `wss://ws.okx.com:8443/ws/v5/public` met `tickers` channel.

**Edits**:

- Maak `lib/okx-stream.ts` (nieuw, ~120 r): klasse `OKXTickerStream` met `subscribe(symbol, callback)`, automatische reconnect met exponential backoff, ping/pong (OKX vereist `{op: 'ping'}` elke 25s).
- Maak `hooks/use-pi-price-stream.ts` (nieuw, ~50 r): React hook die de stream lifecycle beheert, status (`connecting | connected | error`) exposeert, en de `currency` als dependency heeft.
- In `components/price-tracker.tsx`: vervang het `setInterval`-blok (regel 75-82) door `const { price, status } = usePiPriceStream(currency);`.
- Behoud `fetchPiPrice()` voor initial fetch (eerste render heeft direct prijs voordat WS connect) en als fallback bij `status === 'error'`.

**Verificatie**:

- `npm run dev` → DevTools → Network → WS frame-stream zichtbaar.
- Disconnect netwerk → status valt terug op `error`, polling-fallback kicks in via bestaande logic.
- 1 minuut laten draaien → geen memory leak (geen onbeperkte event-listeners).

**Risico** (midden):

- WebSocket-connection-management is foutgevoelig. Reconnect-logica grondig testen (vooral exponential backoff zonder thundering herd op page-revisit).
- Server-side rendering: WS is browser-only. Hook moet `'use client'` zijn en `typeof window !== 'undefined'`-guard hebben.
- Currency-conversion: WS levert PI-USDT; conversie naar EUR/JPY blijft via `OKXApiClient.getConversionRate()` (in-memory cache 5 min). Kan blijven zoals het is.

---

### Fase 10 — React 19 + Next.js 16 + React Compiler (4 u, laag-midden risico)

**Bevinding**: nu `react: 18.2.0`, `next: 15.2.8` (`package.json:58, 60`). Alle Tier 1-3 verbeteringen werken op die versies, maar React 19 + React Compiler maken `price-prediction-card.tsx` (en andere) makkelijker te onderhouden door automatische memoization.

**Edits**:

- `npx @next/codemod@canary upgrade latest` — handelt versie-bumps en breaking-changes-codemods af voor Next 15→16.
- Bump `react@19.2.0`, `react-dom@19.2.0`, `@types/react@19`, `@types/react-dom@19` in `package.json`.
- Enable React Compiler in `next.config.mjs`: `experimental.reactCompiler = true` (in Next 16 is dit stable, geen experimental-flag meer nodig — controleer release notes).
- Verwijder handmatige `useMemo` / `useCallback` in `components/price-prediction-card.tsx` waar de Compiler ze overneemt. Niet alle — alleen waar je zeker weet dat de dependency-array klopte (run de Compiler in `--validate-memo` mode in dev).
- Turbopack is default in Next 16; verwijder `--turbopack` flags indien aanwezig (niet aanwezig hier maar check `package.json:scripts`).

**Verificatie**:

- `npm run validate` groen.
- `npm run build` met Turbopack → meet vergelijking met huidige build-tijd.
- E2E (`npx playwright test`) groen — alle bestaande tests moeten doorlopen.

**Risico** (laag-midden):

- Sonner / Radix UI / lucide-react — controleer of alle versies React 19-compatible zijn. Per [Tailwind 2026 guide](https://blog.logrocket.com/tailwind-css-guide/) is dat in mei 2026 inmiddels universeel.
- React Compiler kan op rare patterns crashen. Mitigatie: Compiler ondersteunt `"use no memo"` directive per file om hem voor één bestand uit te schakelen.

---

### Tier 4 — strategisch (niet gepland, ter overweging)

**Fase 11 — PWA**: manifest + service worker + install prompt. Gebruikt al localStorage voor news-cache; logische uitbreiding. ~1 dag werk. Voordeel: mobiele install + offline news. Nadeel: SW debugging is foutgevoelig, niet aligned met "Pi-dashboard als web-tool".

**Fase 12 — AI sentiment-laag**: kleine LLM-call (Claude Haiku via `@anthropic-ai/sdk`) op de tweet-tekst om bullish/bearish/neutral te taggen. Visualiseer als gekleurde dot links van elke tweet. ~1 dag. Voordeel: directe modernisering. Nadeel: kosten + privacy + buiten scope van een statisch dashboard.

---

## 4. Sprintplanning

| Sprint   | Tijd      | Fases      | Resultaat                                                       |
| -------- | --------- | ---------- | --------------------------------------------------------------- |
| Sprint 1 | ½ dag     | 1, 2, 3, 4 | Lucide overal, skeletons uniform, toasts live, a11y-prijs       |
| Sprint 2 | 1½ dag    | 5, 6       | Tailwind v4, container queries, 3-10× snellere builds           |
| Sprint 3 | ½ dag     | 7          | Mobile-header rijker, view transitions overal                   |
| Sprint 4 | 2-3 dagen | 8          | Chart-cluster vervangen door lightweight-charts (-30% codebase) |
| Sprint 5 | 1 dag     | 9          | OKX WebSocket; geen polling meer                                |
| Sprint 6 | ½ dag     | 10         | React 19 + Next 16 + Compiler                                   |

**Totaal**: ~6-7 werkdagen voor het hele plan. Tier 1 alleen levert al 60% van de zichtbare verbetering in een halve dag.

---

## 5. Risico-matrix

| Fase                  | Regressie-risico | Mitigatie                                                                                                                   |
| --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1-4                   | Verwaarloosbaar  | Alleen visuele/feedback-veranderingen, eenvoudige rollback                                                                  |
| 5 (Tailwind v4)       | Midden           | Snapshot van rendering vóór migratie; kleine PR per breaking-change-categorie                                               |
| 6 (container queries) | Laag             | `@container` is additive, oude `md:`/`lg:` blijven werken naast                                                             |
| 7 (view transitions)  | Laag             | API heeft graceful fallback; oudere browsers krijgen abrupt gedrag (= huidige situatie)                                     |
| 8 (chart)             | **Hoog**         | E2E playwright-tests schrijven vóór migratie zodat regressie zichtbaar is; feature-branch + parallel aan oude implementatie |
| 9 (WebSocket)         | Midden           | Polling-fallback behouden als secundair pad; uitvoerig disconnect-testen                                                    |
| 10 (React 19)         | Laag-midden      | Codemod-script eerst; Compiler `--validate-memo` om silent regressions te vangen                                            |

---

## 6. Nieuwe bestanden (cumulatief over alle fases)

```
components/ui/icons.tsx               (Fase 1)
components/ui/widget-skeleton.tsx     (Fase 2)
lib/toast.ts                          (Fase 3)
components/mobile-header.tsx          (Fase 7)
components/price-chart.tsx            (Fase 8)
components/price-prediction-card.tsx  (Fase 8)
lib/okx-stream.ts                     (Fase 9)
hooks/use-pi-price-stream.ts          (Fase 9)
```

## Verwijderde bestanden bij Fase 8

```
components/price-prediction.tsx           (1034 r)
lib/chart-responsive.ts                   (500 r)
lib/chart-accessibility.ts                (444 r)
lib/chart-performance.ts                  (336 r)
lib/time-label-manager.ts                 (917 r)
hooks/use-chart-accessibility.tsx         (300 r)
__tests__/chart-{accessibility,performance,responsive}.test.ts
__tests__/time-label-manager.test.ts
__tests__/collision-resolution.test.ts
__tests__/dynamic-padding.test.ts
__tests__/font-sizing.test.ts
__tests__/accessibility-integration.test.ts
__tests__/use-chart-accessibility.test.tsx
```

Netto: ~3500 regels handgeschreven code uit, ~600 regels lib-integratie in.

---

## 7. Beslispunten vooraf (vragen om voor Sprint 4 te beantwoorden)

1. **Chart-library**: lightweight-charts (advies) of Recharts? Lightweight-charts heeft TradingView-attribution-eis.
2. **Browser-baseline**: Tailwind v4 vereist Safari 16.4+ / Chrome 111+ / Firefox 128+. Akkoord?
3. **Tier 4** (PWA, AI sentiment): later opnieuw bekijken of definitief uit scope?

---

## Sources

- [Next.js 16 release](https://nextjs.org/blog/next-16) · [Next 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19 release](https://react.dev/blog/2024/12/05/react-19) · [React versions](https://react.dev/versions)
- [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) · [Tailwind v4 features (LogRocket 2026)](https://blog.logrocket.com/tailwind-css-guide/) · [Tailwind v4 breaking changes](https://thesyntaxdiaries.com/tailwind-css-v4-migration-breaking-changes)
- [Crypto dashboard 2026 trends](https://multipurposethemes.com/blog/discover-bitcoin-and-crypto-dashboard-for-smart-trading-in-2026/) · [Smart visualization dashboards](https://multipurposethemes.com/blog/new-crypto-dashboard-trading-ui-now-enhanced-with-smarter-visualization/)
- [TradingView lightweight-charts (chart-library kandidaat Fase 8)](https://github.com/tradingview/lightweight-charts)
- [OKX WebSocket public channels (Fase 9)](https://www.okx.com/docs-v5/en/#websocket-api-public-channel-tickers-channel)
