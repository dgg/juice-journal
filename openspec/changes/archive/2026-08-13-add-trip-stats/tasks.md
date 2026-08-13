## 1. Date helpers

- [x] 1.1 Add `currentWeekBoundsUtc(zone, now)` and `prevWeekBoundsUtc(zone, now)` to `src/utils/dates.ts` (ISO week Mon 00:00 → next Mon 00:00 in display TZ, converted to UTC ISO)
- [x] 1.2 Add `currentYearBoundsUtc(zone, now)` and `prevYearBoundsUtc(zone, now)` to `src/utils/dates.ts` (Jan 1 00:00 → Jan 1 next year in display TZ)
- [x] 1.3 Add `periodBoundsUtc(period, zone, now)` dispatcher returning `{ current: {startUtc,endUtc}, previous: {...} }` for `week|month|year`
- [x] 1.4 Unit-test the four helpers (incl. week-boundary edge case: trip late Friday local / early Saturday UTC lands in correct display-TZ week)

## 2. Stats queries

- [x] 2.1 Rename `statsQueries.monthlyAggregates` → `periodAggregates` in `src/db/queries/stats.ts`; extend return shape with `avgSpeed` (AVG of `avg_speed_kmh`) and `tripCount` (`COUNT(*)`); keep `monthlyAggregates` as a thin alias calling `periodAggregates`
- [x] 2.2 Add `statsQueries.periodSeries({ startUtc, endUtc, vehicleId?, bucket: "trip"|"week"|"month" })` returning `{ label, distance_km, duration_min, avg_speed_kmh, avg_consumption_kwh_100km }[]`
- [x] 2.3 Implement `bucket="trip"` branch: per-trip rows ordered by `end_time` asc
- [x] 2.4 Implement `bucket="week"`/`"month"` branches: `date_trunc` on display-TZ-converted `end_time`, `SUM` distance/duration, `AVG` speed/consumption, label (`W##` / short month)
- [x] 2.5 Extend `src/db/queries/stats.test.ts` with `periodAggregates` cases (avg speed, trip count, null handling) and `periodSeries` cases for all three buckets, including the display-TZ bucketing edge case from 1.4

## 3. Backend handlers & routes

- [x] 3.1 Create `src/backend/stats.tsx` with `statsHandler` (renders `StatsPage`) and `getPartialTripStats` (renders stats + charts fragment), reading `period` and `yearGranularity` query params (defaults: `month`, `month`)
- [x] 3.2 Compute `StatsView` (period, label, vehicle, stats with prev-period deltas, series, hasTrips) reusing `periodBoundsUtc` + `periodAggregates` + `periodSeries`
- [x] 3.3 Wire `app.get("/stats", statsHandler)` and `app.get("/partials/trip-stats", getPartialTripStats)` in `src/backend/index.ts` (do NOT touch home's `/partials/stats`)
- [x] 3.4 Add validation for `period` (`week|month|year`) and `yearGranularity` (`month|week`) query params returning error on invalid input

## 4. Frontend views

- [x] 4.1 Create `src/frontend/pages/StatsPage.tsx` (full `Layout`, period switcher, year-granularity toggle, stats grid, charts region) consuming `StatsView`
- [x] 4.2 Create `src/frontend/fragments/StatsChartsFragment.tsx` (the HTMX-swappable `<section id="stats-region">` with switcher + stats + charts/empty-state + embedded JSON `#stats-data`)
- [x] 4.3 Wire period switcher buttons with `hx-get="/partials/trip-stats"`, `hx-target="#stats-region"`, `hx-swap="outerHTML"`, `hx-vals='{"period":"..."}'`; year toggle adds `yearGranularity`
- [x] 4.4 Render stats grid: total distance, avg speed, avg duration (with `avgDurationHm`), avg consumption, trip count — each with prev-period delta indicator (reuse `StatsGrid`/`StatCard` pattern)
- [x] 4.5 Render empty-state message when `hasTrips` is false; otherwise two `<canvas>` elements + the embedded JSON blob
- [x] 4.6 Add Chart.js CDN tag (pinned v4) + `<script src="/static/stats-charts.js" defer>` to `StatsPage` (conditional: stats page only, not Layout)

## 5. Client chart script

- [x] 5.1 Create `public/stats-charts.js`: read `JSON.parse(document.getElementById('stats-data').textContent)`, build two Chart.js bar instances with dual y-axes (chart 1: km left / min right; chart 2: km/h left / kWh/100km right)
- [x] 5.2 Guard: no-op cleanly when `#stats-data` is absent or empty (home page, empty state)
- [x] 5.3 Use responsive canvas sizing; distinct colors per series; tooltips show real units

## 6. Styling

- [x] 6.1 Add Pico-grounded CSS to `public/app.css` for the period switcher (segmented control) and year-granularity toggle — prefer overriding Pico vars/`--pico-*` over new rules; no inline `<style>` anywhere
- [x] 6.2 Add `@media` rule hiding the chart region (`#stats-charts`) on viewports below the Pico tablet breakpoint; stats cards + switcher stay visible (per D8 / spec)
- [x] 6.3 Verify mobile layout: switcher + stats fit a phone screen, charts hidden; tablet/desktop shows charts

## 7. Verification

- [x] 7.1 `bun test` — all existing tests pass plus new stats/date tests (stats/dates tests pass; pre-existing handler test failures unrelated)
- [x] 7.2 `prettier --check .` and `tsc --noEmit` clean (new files pass; pre-existing errors unchanged)
- [x] 7.3 `docker build .` succeeds
- [x] 7.4 Manual smoke: `/stats` renders; period switcher swaps via HTMX; year Month/Week toggle swaps; empty period shows empty state; home `/` unchanged and does not load Chart.js; phone-width viewport hides charts, keeps stats
