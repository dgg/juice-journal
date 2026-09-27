# Proposal

## Why

Issue #9 asks for a calendar heatmap of commutes with efficiency color-coding against the period average. The stats page already aggregates per-trip data for the week period and bucketed data for the month, and already ships a client-side chart pipeline (embedded JSON + vanilla-JS mount on `htmx:afterSettle`). A calendar visualization reuses this proven pipeline to show each trip in its calendar cell, color-coded by consumption relative to the period average, with click-to-detail reusing the home page's trip pill markup.

## What Changes

- Add a FullCalendar (v7.1.0, Breezy theme, indigo palette overridden to Pico semantic vars) calendar below the existing charts, inside the existing `#stats-charts` region so it inherits the desktop-only CSS rule.
- Week period renders a `dayGridWeek` view; month period renders a `dayGridMonth` view. Year period renders no calendar (year data is bucketed, not per-trip).
- Each trip renders as a calendar event showing the daypart icon (morning/afternoon) and the trip's consumption as the title. Consumption is color-coded client-side against the period average: green (below average), amber (above), red (highest in period); the min and max trips render bold.
- Add a per-trip data path to the stats view: extend `StatsView` with a `trips` array (individual trips with `id`, `time`, `daypart`, `consumption`) for week and month, sourced from `PeriodTrips` (extended to SELECT `id`). The existing `series` field (bucketed) continues to feed the line charts unchanged.
- Add an HTMX endpoint `GET /stats/trips/:id` returning the trip-detail-pills HTML (the same `<dl class="trip-detail-pills">` block used by the home page `TripRow`), so clicking a calendar trip fetches and displays its details in the home-page pill shape.
- Load FullCalendar via CDN + SRI in `StatsPage`, alongside the existing Chart.js script, following the same mount-on-`htmx:afterSettle` pattern as `stats.mjs`.
- Override Breezy's indigo palette `--fc-breezy-*` variables with Pico semantic vars in `public/app.css` (~15-20 lines, light block only; no dark-mode block since the project has no dark-mode switch). Reserve fixed Pico shades (`--pico-color-green/amber/red-500`) for the consumption tone colors, which stay constant regardless of any future restyle.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-stats`: adds the calendar visualization (week/month dayGrid, per-trip events with consumption color-coding, click-to-detail via a new `GET /stats/trips/:id` fragment endpoint) and a per-trip `trips` data path on the stats view
- `frontend-views`: names FullCalendar alongside Chart.js as an optional stats-page asset permitted in the browser

## Impact

- **Backend**: `StatsView` type gains a `trips` field; `PeriodTrips` query SELECTs `id`; new `GET /stats/trips/:id` route + a small `FindById` query; `computeStatsView` runs `PeriodTrips` for month too (one extra query per month-page load).
- **Frontend**: new `public/scripts/*.mjs` for FullCalendar mount; `StatsChartsFragment` emits a calendar container + trips JSON blob inside `#stats-charts`; `StatsPage` adds the FullCalendar CDN script.
- **Styling**: `public/app.css` gains `--fc-breezy-*` overrides mapping to Pico vars + calendar event tone classes.
- **Dependencies**: FullCalendar v7.1.0 (approved in AGENTS.md, not yet in package.json) loaded via CDN, no npm install.
- **No breaking changes** to existing routes, APIs, or the trip data structure.

## Rollback

The calendar is additive: remove the FullCalendar `<script>` from `StatsPage`, the calendar container + trips blob from `StatsChartsFragment`, the `trips` field from `StatsView`, the `id` column from `PeriodTrips`, the `GET /stats/trips/:id` route + `FindById` query, the FullCalendar `.mjs`, and the `--fc-breezy-*` / tone rules from `app.css`. The existing charts, stats cards, and period navigation are untouched and continue to work.
