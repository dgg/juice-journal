## Why

The home page only shows the current month's aggregates. There is no way to see commute trends over a week or a full year, nor any visual breakdown of individual trips. Issue #3 asks for aggregated stats over week/month/year periods plus two charts (distance+duration, avg speed+consumption). This change adds a dedicated stats page so the home page stays a month snapshot while stats get their own home with period switching and visualization.

## What Changes

- **New `/stats` route** rendering a dedicated stats page with a period switcher (week / month / year) and a year-granularity toggle (Month / Week, default Month).
- **Period switching via HTMX** — the period switcher and year toggle swap the stats + charts region through a partial (`/partials/stats`), no full page reload.
- **Generalized stats queries** — `statsQueries.monthlyAggregates` is generalized to period-agnostic aggregates over an arbitrary UTC window, returning: total distance, average speed (mean of per-trip `avg_speed_kmh`), average duration (min), average consumption (mean of per-trip `kWh/100km`), and trip count.
- **Prev-period deltas** — each stat shows a delta vs the previous equivalent period (prev week / prev month / prev year), reusing the home page's delta pattern. Stats only; charts render the current period only.
- **Per-trip series for charts** — new query returns per-trip `distance_km`, `duration_min`, `avg_speed_kmh`, `avg_consumption_kwh_100km` ordered by `end_time`, for the week and month periods.
- **Bucketed series for year** — for the year period (both Month and Week toggles), the series query returns bucketed aggregates (sum of distance/duration, avg of speed/consumption) keyed by ISO week or calendar month, instead of per-trip rows.
- **Two Chart.js charts**, dual y-axis each:
  - Chart 1: distance (km, left axis) + duration (min, right axis) per trip (week/month) or per bucket (year).
  - Chart 2: avg speed (km/h, left axis) + avg consumption (kWh/100km, right axis) per trip (week/month) or per bucket (year).
- **Chart.js delivered via CDN `<script>` tag** in the Layout, loaded only on the stats page (conditional). A small vanilla-JS init script renders the canvases from JSON embedded in the page server-side.
- Empty-period handling: stats show null/dash, charts render an empty-state message, no canvas.

## Capabilities

### New Capabilities

- `trip-stats`: Aggregated trip statistics over week/month/year periods with prev-period deltas, per-trip and bucketed chart series, and a dedicated stats page with HTMX-driven period switching and Chart.js dual-axis charts.

### Modified Capabilities

_(none — the home page, JSON trips API, and trip input are unchanged. `statsQueries.monthlyAggregates` is generalized but its existing callers continue to work against the same return shape.)_

## Impact

- **Code**: new `src/backend/stats.tsx` (page handler) and `src/backend/html-handlers.tsx` partial (`getPartialStats` extended, or new `getPartialTripStats`); `src/db/queries/stats.ts` (generalize aggregates + new series queries); new `src/frontend/pages/StatsPage.tsx` + `src/frontend/fragments/StatsChartsFragment.tsx`; `src/frontend/Layout.tsx` (conditional CDN script + init); `src/backend/index.ts` (new routes); `src/utils/dates.ts` (week/year bounds helpers); `public/app.css` (period switcher + toggle styling, Pico-grounded).
- **API**: new `GET /stats`, `GET /partials/stats?period=...&yearGranularity=...`. No `GET /api/...` JSON endpoint added in this change (charts consume embedded JSON). No breaking changes.
- **Dependencies**: Chart.js loaded via CDN — no new npm dependency. No bundle step.
- **DB**: no migration. All values derive from existing `trips` columns.
- **Rollback**: remove `/stats` + `/partials/stats` query params and the stats page/fragment, revert `statsQueries` to `monthlyAggregates`-only, drop CDN script + init from Layout, remove date helpers and CSS. No data migration needed.
