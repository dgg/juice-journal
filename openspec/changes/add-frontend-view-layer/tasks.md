## 1. Configuration & static serving

- [x] 1.1 Update `tsconfig.json`: set `"jsx": "react-jsx"` (or `"preserve"` per Bun) and `"jsxImportSource": "hono/jsx"`; ensure `.tsx` is included. Verify `bun test` still passes.
- [x] 1.2 Create `public/` directory and an empty `public/app.css` placeholder.
- [x] 1.3 Add static-serving route in `src/backend/index.ts` for `/static/*` → `public/` using `serveStatic` from `hono/bun` (or `Bun.file` per AGENTS.md Bun-API preference). Verify `GET /static/app.css` returns the file with CSS content type.
- [x] 1.4 Add HTMX script tag source (CDN or local under `/static/`) to the `Layout` `<head>` (added in 3.1).

## 2. CSS audit & app.css

- [x] 2.1 Audit the ~140-line inline `<style>` in `src/backend/home.ts` against the 3-tier rule (Pico native → `--pico-*` overrides → custom `app.css`). Record each rule's tier decision.
- [x] 2.2 Write `public/app.css` with survivors only: `--daypart-*` `:root` vars (rule #2), `.daypart-indicator.morning/.afternoon` colors, `.sticky-cta`, `.delta.positive/.negative` (rule #3). Target ~15-20 lines.
- [x] 2.3 Replace inline-style layout with Pico-native classes / semantic HTML where rule #1 applies (container, header bar, stats grid, hero stat, trip-details dl grid).

## 3. Layout & atoms (`src/frontend/`)

- [x] 3.1 Create `src/frontend/Layout.tsx`: emits `<!DOCTYPE html>`, `<head>` (meta, title prop, Pico CSS CDN link, `/static/app.css` link, HTMX script), `<body hx-boost="true">` wrapping `children`.
- [x] 3.2 Create `src/frontend/format.ts`: `formatNumber(value, decimals)` (pure; no escaping — JSX handles it).
- [x] 3.3 Create `src/frontend/components/Header.tsx` (`<Header month vehicle/>`): month title + vehicle badge.
- [x] 3.4 Create `src/frontend/components/StatCard.tsx` and `StatsGrid.tsx` (`<StatsGrid stats/>`): hero stat, secondary stats, MoM deltas via `<Delta/>`.
- [x] 3.5 Create `src/frontend/components/Delta.tsx` (`<Delta value unit/>`).
- [x] 3.6 Create `src/frontend/components/TripRow.tsx` (`<TripRow trip/>`): `<details>`/`<summary>`, daypart indicator, date/time, consumption, expandable detail dl. No `hx-*` attrs (atom stays pure).
- [x] 3.7 Create `src/frontend/components/EmptyState.tsx` and `StickyCta.tsx`.

## 4. Pages

- [x] 4.1 Create `src/frontend/pages/HomePage.tsx`: composes `Layout` + `Header` + `StatsGrid` + trip list (`trips.map(TripRow)` or `EmptyState`) + `StickyCta`. Wrap trip list `<section id="trip-list">`.
- [x] 4.2 Refactor `src/backend/home.ts`: keep data-fetch logic only; remove `renderHomePage`/`renderTripRow`/`renderDelta`/`formatNumber`/`escapeHtml`. `homeHandler` returns `c.html(<HomePage data={data}/>)`. Verify visual parity with prior page.

## 5. Fragment routes & OOB

- [x] 5.1 Create `src/frontend/fragments/TripListFragment.tsx`: bare `<>` of `trips.map(TripRow)` (or `EmptyState`), no `Layout`.
- [x] 5.2 Create `src/frontend/fragments/StatsFragment.tsx`: bare `<StatsGrid stats/>`, no `Layout`.
- [x] 5.3 Add `GET /partials/trips` and `GET /partials/stats` handlers in `src/backend/` reusing existing query helpers; wire routes in `index.ts`.
- [x] 5.4 Create `src/frontend/fragments/TripCreatedResponse.tsx`: new `TripRow` with `hx-swap-oob="beforeend:#trip-list"` + refreshed `StatsGrid` with `hx-swap-oob="true"`.

## 6. Trip form page & HTML POST endpoint

- [x] 6.1 Create `src/frontend/pages/TripFormPage.tsx`: `Layout`-wrapped form with semantic inputs (vehicle, start/end location, start/end time, odometer, consumption), `hx-post="/trips"`, `hx-target="#trip-list"`, `hx-swap="beforeend"`.
- [x] 6.2 Add `GET /trips/new` route returning `c.html(<TripFormPage/>)`.
- [x] 6.3 Add `POST /trips` handler: parse form-encoded body, run shared Zod validators + `tripConflictValidator`, create trip via existing `tripsQueries.createTrip`, return `c.html(<TripCreatedResponse row stats/>)` on success; on validation failure return problem details suitable for inline HTMX display.
- [x] 6.4 Share validators between `POST /api/trips` and `POST /trips` (only response format differs).

## 7. Wiring & tests

- [x] 7.1 Wire all new routes in `src/backend/index.ts`: `/partials/trips`, `/partials/stats`, `/trips/new`, `POST /trips`. Confirm `GET /` and JSON `POST /api/trips` unchanged.
- [x] 7.2 Update `src/backend/home.test.ts` to assert rendered HTML from `HomePage` (presence of stats, trip rows, empty state, deltas).
- [x] 7.3 Add tests for fragment routes: `GET /partials/trips` populated + empty, `GET /partials/stats`.
- [x] 7.4 Add tests for `POST /trips`: success returns `TripRow` + OOB stats; validation failure returns problem details.
- [x] 7.5 Add test for `GET /trips/new`: renders form posting to `/trips`.
- [x] 7.6 Run `bun test`; verify all green. Run `docker build .` per AGENTS.md.
