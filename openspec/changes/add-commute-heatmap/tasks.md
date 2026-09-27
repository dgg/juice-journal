# Tasks

## 1. Backend: per-trip data path

- [ ] 1.1 Extend `PeriodTrips` (`src/backend/db/queries/stats/PeriodTrips.ts`) to SELECT `id` in both the `StatTrip` type and the SQL query, and verify `bun test src/backend/db/queries/stats/PeriodTrips.test.ts` passes with the new `id` field present on each returned trip
- [ ] 1.2 Add a `trips` field to `StatsView` (`src/backend/presentation/stats/types.ts`) typed as an array of `{ id: string; time: DateTime; daypart: Daypart; consumption: number | null }`, and verify `bun check` passes
- [ ] 1.3 Update `computeStatsView` (`src/backend/presentation/stats/stats.tsx`) to run `PeriodTrips` for the month period too (currently only runs for week), populate `trips` for week and month, and set `trips` to an empty array for the year period; verify the stats view test confirms `trips` is populated for month and empty for year
- [ ] 1.4 Verify the existing `series` field (bucketed) is unchanged for all periods — the line charts must still render from day-bucketed aggregates for month and granularity buckets for year; run `bun test src/frontend/__tests__/stats-charts.test.tsx` to confirm no regression

## 2. Backend: trip detail endpoint

- [ ] 2.1 Create `FindById` query (`src/backend/db/queries/trips/FindById.ts`) that SELECTs the full `TripRow` by `id` and maps to `TripSnapshot`; verify a query test covers the found case and the not-found case
- [ ] 2.2 Extract the `<dl class="trip-detail-pills">` body from `TripRow` (`src/frontend/components/TripRow.tsx`) into a shared `TripDetailPills` atom (`src/frontend/components/TripDetailPills.tsx`) consumed by `TripRow`; verify `bun test src/frontend/__tests__/trip-row.test.tsx` passes (the home page pills must render identically)
- [ ] 2.3 Add `GET /stats/trips/:id` route to the stats domain (`src/backend/presentation/stats/stats.tsx`) that runs `FindById`, renders `<TripDetailPills>` on success, and returns 404 when no trip matches; verify a route test covers the 200 (pills HTML returned) and 404 (nonexistent id) cases

## 3. Frontend: calendar container and FullCalendar load

- [ ] 3.1 Spike the FullCalendar v7 CDN: find the exact jsDelivr/unpkg URL for the pre-built bundle, confirm whether it requires `type="module"` or a classic script, and record the URL + SRI hash; verify the script loads without console errors on a blank page
- [ ] 3.2 Add the FullCalendar CDN `<script>` (with SRI) to the `Scripts` component in `StatsPage` (`src/frontend/pages/StatsPage.tsx`), and verify the script tag is absent from `HomePage` and `TripFormPage` (grep the rendered HTML)
- [ ] 3.3 Add a `<div id="stats-calendar">` container and a `<script id="calendar-data" type="application/json">` blob (containing `data.trips` + `data.period` + `data.stats.avgConsumption`) to `StatsChartsFragment` (`src/frontend/fragments/StatsChartsFragment.tsx`) inside `#stats-charts`, rendered only when `data.period` is week or month and `data.hasTrips` is true; verify the fragment test confirms the calendar container and JSON blob are present for week/month and absent for year

## 4. Frontend: calendar mount script and tone logic

- [ ] 4.1 Create `public/scripts/calendar.mjs` following the `stats.mjs` destroy/re-render pattern: read `#calendar-data` JSON, initialize `FullCalendar.Calendar` with `dayGridWeek` (week) or `dayGridMonth` (month), `headerToolbar: false`, `selectable: false`, and re-render on `htmx:afterSettle` when `#stats-region` swaps; verify the calendar renders on a desktop viewport with test trips
- [ ] 4.2 Implement the `eventContent` render hook in `calendar.mjs` to emit the daypart icon (`icon-clock-8` / `icon-clock-4`) + consumption value (`toFixed(1)`) with a `cal-tone--<tone>` class; verify a week-calendar event shows the icon + consumption text
- [ ] 4.3 Implement the tone computation in `calendar.mjs`: compute min/max/avg from the trips array + `avgConsumption`, assign `cal-tone--green` (below avg), `cal-tone--amber` (above avg), `cal-tone--red` (highest), and `cal-tone--bold` (min + max); verify the highest trip renders red+bold and the lowest renders green+bold
- [ ] 4.4 Implement the `eventClick` handler in `calendar.mjs`: fetch `GET /stats/trips/:id` via HTMX (or `fetch`) and inject the returned pills HTML into a detail panel below the calendar; verify clicking an event fetches and displays the trip detail pills

## 5. Styling: Breezy palette override and tone classes

- [ ] 5.1 Add `--fc-breezy-*` overrides to `public/app.css` mapping Breezy's indigo palette vars to Pico semantic vars (`--pico-primary`, `--pico-background-color`, `--pico-color`, `--pico-muted-color`, `--pico-muted-border-color`, etc.), light block only; verify the calendar's borders, background, and text match Pico's neutral palette rather than Breezy's hardcoded hex
- [ ] 5.2 Add `.cal-tone--green`, `.cal-tone--amber`, `.cal-tone--red`, and `.cal-tone--bold` classes to `public/app.css` using Pico color vars (`--pico-color-green-500`, `--pico-color-amber-500`, `--pico-color-red-500`) and `font-weight: 700`; verify the three tone colors render correctly on calendar events
- [ ] 5.3 Verify `prettier --check public/app.css` passes (the file follows `.prettierrc` formatting)

## 6. Integration verification

- [ ] 6.1 Run `bun check` (TypeScript typecheck) and fix any errors
- [ ] 6.2 Run `bun test` (full test suite) and fix any failures
- [ ] 6.3 Run `docker build .` and verify the image builds successfully
- [ ] 6.4 Verify no unnecessary npm dependencies were added (FullCalendar is CDN-only, not in `package.json`)
