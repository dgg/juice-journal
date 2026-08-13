## Context

Today `src/db/queries/stats.ts` exposes only `monthlyAggregates` over an arbitrary UTC window — callers (`homeHandler`, `getPartialStats`) pass month bounds. The home page renders month stats + prev-month deltas via `StatsFragment`/`StatsGrid`. No charts exist; Chart.js is an approved but unused dependency. Display timezone is resolved from `DISPLAY_TZ` (fallback `Europe/Copenhagen`); month/prev-month bounds are computed in `src/utils/dates.ts` (`currentMonthBoundsUtc`, `prevMonthBoundsUtc`). The vehicle shown is "latest trip's vehicle" via `tripsQueries.findLatestTripVehicleId`. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Reuse the existing aggregates + delta rendering pattern (home page) for the new stats page.
- Generalize period-bound computation to week and year without breaking month callers.
- Ship charts with zero new npm dependencies and no build step (Chart.js via CDN + vanilla init).
- Keep the home page, JSON trips API, and trip input unchanged.

**Non-Goals:**
- No `GET /api/...` JSON stats endpoint in this change (charts consume embedded JSON; an API endpoint can be added later if other clients need it).
- No cross-vehicle comparison or explicit vehicle picker (stays "latest trip's vehicle", matching home).
- No persistence of the selected period/granularity beyond the URL query string.
- No date-range picker — only the three rolling periods (current week / month / year) and their previous-period counterparts.

## Decisions

### D1: Generalize `statsQueries.monthlyAggregates` → `periodAggregates`
Rename and keep the same return shape (`avgConsumption`, `avgDuration`, `totalDistance`) plus two new fields (`avgSpeed`, `tripCount`). The function is already period-agnostic (it takes `startUtc`/`endUtc`); only the name is month-specific. Add `avg_speed_kmh` to the `AVG(...)` and a `COUNT(*)` to the query.
- **Alternative:** keep `monthlyAggregates` and add a parallel `periodAggregates`. Rejected — two near-identical queries drift; the single function already accepts arbitrary windows.
- Existing callers keep working: `homeHandler`/`getPartialStats` ignore the new `avgSpeed`/`tripCount` fields (TypeScript structural typing). A follow-up can surface them on home if desired.

### D2: New `periodSeries` query returns either per-trip rows or bucketed rows
One query, `periodSeries({ startUtc, endUtc, vehicleId?, bucket })` where `bucket ∈ { "trip", "week", "month" }`:
- `trip`: returns `{ label, distance_km, duration_min, avg_speed_kmh, avg_consumption_kwh_100km }` per trip ordered by `end_time` asc — used for week/month periods.
- `week` / `month`: returns one row per ISO week / calendar month with `SUM(distance_km)`, `SUM(duration_min)`, `AVG(avg_speed_kmh)`, `AVG(avg_consumption_kwh_100km)`, and a label (`"W32"`, `"Aug"`) — used for the year period.
- Bucketing done in SQL with `date_trunc('week', end_time)` / `date_trunc('month', end_time)` on the UTC `end_time`, grouped. ISO week from `date_trunc('week', ...)` (Postgres `week` starts Monday) — matches the week-period bounds.
- **Alternative:** bucket in application code from per-trip rows. Rejected for the year period — fetching ~250 trips to bucket in JS is wasteful and the SQL is straightforward; week/month per-trip fetches are small (≤7 and ≤31 days).
- Null `avg_speed_kmh` / `avg_consumption_kwh_100km` rows: SQL `AVG()` already ignores NULLs, matching the spec's "mean over trips that have a non-null value".

### D3: Period bounds via new `src/utils/dates.ts` helpers
Add `currentWeekBoundsUtc(zone, now)` and `currentYearBoundsUtc(zone, now)` plus `prevWeekBoundsUtc` / `prevYearBoundsUtc`, mirroring the existing month helpers (start-of-period in display TZ → UTC ISO, exclusive end). Add a small dispatcher `periodBoundsUtc(period, zone, now)` returning `{ current, previous }` to keep handlers DRY.
- **Alternative:** compute bounds in the handler. Rejected — duplicates the existing helper pattern and the prev-period math is fiddly.

### D4: Routes — `GET /stats` (page) and `GET /partials/stats` (partial), both in `src/backend/index.ts`
- `/stats` renders `StatsPage` (full layout, includes Chart.js CDN + init script).
- `/partials/stats?period=...&yearGranularity=...` returns the stats+charts fragment only, swapped by HTMX. The period switcher and year toggle use `hx-get`, `hx-target`, `hx-swap="outerHTML"` on a wrapping `<section id="stats-region">` so the switcher itself updates its active state on swap.
- **Alternative:** reuse the existing `/partials/stats` (currently home's month-only partial). It returns a different fragment shape (home stats grid). Splitting keeps concerns clean: home partial stays month-only, stats partial is period-aware. The existing `getPartialStats` is renamed internally but its `/partials/stats` route is repurposed — see Migration Plan for the home-page impact.
- **Decision:** keep home's partial at `/partials/stats` untouched to avoid breaking home's HTMX, and add `/partials/trip-stats` for the new stats page. Avoids a subtle coupling between two pages sharing one partial.

### D5: Chart.js via CDN, conditional in Layout
`src/frontend/Layout.tsx` gains an optional `scripts?: ReactNode` prop (or a boolean `withCharts`). `StatsPage` passes the Chart.js CDN tag + an inline-ish reference to `public/stats-charts.js` (served by the existing `/static/*` handler). The init script reads `JSON.parse(document.getElementById('stats-data').textContent)` and builds two `Chart` instances with dual y-axes.
- CDN URL pinned to a fixed Chart.js v4 version (per `package.json` approved dep note) with `crossorigin="anonymous"`. SRI hash included.
- **Alternative:** vendor Chart.js into `public/`. Rejected per user decision — CDN tag is acceptable; no build step needed.
- **Alternative:** inline the init script. Rejected — keep it in `public/stats-charts.js` so the Layout stays clean and the script is cacheable.

### D6: Stats data shape passed to the page
The handler computes one `StatsView` object:
```
{
  period: "week" | "month" | "year",
  yearGranularity: "month" | "week" | null,
  label: string,            // "Aug 2026", "W32 2026", "2026"
  vehicle: { id, description } | null,
  stats: { totalDistance, avgSpeed, avgDuration, avgDurationHm, avgConsumption, tripCount, prev* },
  series: { labels: string[], distance: number[], duration: number[], speed: number[], consumption: number[] },
  hasTrips: boolean
}
```
`avgDurationHm` is a preformatted `"1h 15m"` string for display; `avgDuration` (minutes) stays for delta math. `series` is embedded as JSON for the init script.

### D7: Avg speed definition
Arithmetic mean of per-trip `avg_speed_kmh` (per user decision), consistent with how `avg_consumption` is already computed. For year buckets, `AVG(avg_speed_kmh)` over the bucket's trips. Documented in the spec.

### D8: Phone renders simplified stats (charts hidden via CSS)
The stats page stays reachable at `/stats` on phone, but the chart region is hidden on viewports below the Pico tablet breakpoint (`@media (max-width: 768px)` or Pico's existing `--pico-breakpoint-sm`/`-md`). Stats cards, period switcher, and year toggle remain visible. One CSS rule in `public/app.css` — no JS branching, no separate route.
- **Alternative A:** hide `/stats` on phone entirely (redirect to `/`). Rejected — loses quick-glance period numbers, which are useful on phone.
- **Alternative B:** ship full charts on phone. Rejected — dual-axis bars unreadable at 375px.
- The init script still runs server-side-embedded JSON regardless of viewport; Chart.js canvases simply are not visible on phone. No perf concern (CDN script is small, cached).

## Risks / Trade-offs

- [Chart.js via CDN adds a runtime external dependency in the Docker container] → Mitigation: pin exact version + SRI; if offline/unavailable the charts simply don't render but stats (server-rendered) remain usable. Acceptable for a personal app.
- [Per-trip series for a month with many trips could produce wide charts] → Mitigation: month ≤31 days so bar count stays low; Chart.js handles horizontal scroll via responsive canvas sizing. Year never goes per-trip (bucketed by design).
- [Repurposing `/partials/stats` would break home's HTMX] → Mitigation: D4 — use a separate `/partials/trip-stats` route; home's partial untouched.
- [SQL bucketing `date_trunc('week', end_time)` uses UTC, not display TZ] → Mitigation: week/year periods are defined in the display TZ (spec), so bucket by `end_time AT TIME ZONE 'utc' AT TIME ZONE <displayTz>` before `date_trunc`, OR clamp bucket labels to display-TZ calendar boundaries. Verify in a test that a trip late Friday local but early Saturday UTC lands in the correct display-TZ week. This is the main correctness risk.
- [Prev-period for year = previous calendar year, 365/366 days] → Acceptable; ISO-week prev-period for the week view uses the previous ISO week (clean 7-day window), avoiding leap-year skew for the week period.

## Migration Plan

1. Add `periodAggregates` + `periodSeries` to `src/db/queries/stats.ts`; keep `monthlyAggregates` as a thin alias (or update its 2 callers) so home keeps working during the transition.
2. Add date helpers to `src/utils/dates.ts`.
3. Add `StatsPage` + `StatsChartsFragment` + `public/stats-charts.js`; extend `Layout` with conditional scripts.
4. Wire `GET /stats` and `GET /partials/trip-stats` in `src/backend/index.ts`; add `statsHandler` + `getPartialTripStats` (new file `src/backend/stats.tsx`).
5. Add tests (`stats.test.ts` already exists — extend with `periodAggregates` + `periodSeries` cases including week/year bucketing and the display-TZ bucketing edge case).
6. Rollback: delete new routes/files, remove the date helpers and CDN script wiring, restore `monthlyAggregates` to its current form. No DB migration to undo.

## Open Questions

- Should the year-period bucket label use ISO week number (`W32`) or a date range (`Aug 4–10`)? Default: ISO week number for the Week toggle, short month name for the Month toggle. Deferrable — cosmetic, decided during implementation.
- Should the period switcher persist across navigations via a query param only, or also a cookie? Default: query param only (`/stats?period=year&yearGranularity=month`). Deferrable.
