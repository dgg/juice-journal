## 1. Query: add total-duration aggregate

- [ ] 1.1 Add `SUM(duration_min) as total_duration` to both branches (with/without `vehicleId`) of `periodAggregates` in `src/db/queries/stats.ts`
- [ ] 1.2 Add `totalDuration: number | null` to the `PeriodAggregates` interface; populate it in the return object mirroring the `totalDistance !== null ? ... : null` guard pattern
- [ ] 1.3 Extend `src/db/queries/stats.test.ts` to assert `totalDuration` is the sum of `duration_min` for trips in the period, and is `null` for an empty period

## 2. Backend: extend `StatsView`

- [ ] 2.1 Add `totalTime: StatWithDelta` and `totalTimeHm: string | null` to the `StatsView.stats` interface in `src/backend/stats.tsx` (and the local interface in `StatsChartsFragment.tsx` if it duplicates)
- [ ] 2.2 Populate `totalTime` from `currentStats.totalDuration` / `prevStats.totalDuration` in `computeStatsView`
- [ ] 2.3 Populate `totalTimeHm` via the existing `formatDurationHm` helper (no new helper)
- [ ] 2.4 Verify the existing stats view tests still pass; extend them to assert `totalTime` and `totalTimeHm` for a known fixture

## 3. Frontend: swap local `StatCard` for shared `StatCard`

- [ ] 3.1 Remove the local `StatCard` function from `src/frontend/fragments/StatsChartsFragment.tsx`
- [ ] 3.2 Import the shared `StatCard` from `src/frontend/components/StatCard.tsx` in the fragment
- [ ] 3.3 Update the four existing secondary `StatCard` call sites in the fragment to use the shared component's `stat={{...}}` prop shape
- [ ] 3.4 Verify the stats page renders the existing five stats unchanged (visual parity check via `bun test` and a manual `bun dev` spot-check)

## 4. Frontend: render the hero + grid layout

- [ ] 4.1 Add a `.stats-hero-row` wrapper around two `StatCard`s rendered with `hero` prop: total distance (icon `route`) and total time driven (icon `hourglass`)
- [ ] 4.2 Wrap the four secondary `StatCard`s in a `.stats-grid__row` (existing class) instead of the flat `.stats-grid`
- [ ] 4.3 Verify the `total-time-driven` card uses `displayValue={data.stats.totalTimeHm}` with an empty `unit` and `deltaUnit="min"`, mirroring the avg-duration card
- [ ] 4.4 Verify hero cards carry the period-aware delta (same `period={data.period}` prop as secondaries)

## 5. Frontend: relocate the year-granularity toggle

- [ ] 5.1 Move the `data.period === "year"` granularity-toggle JSX block from above `PeriodNavigation` to directly above the `#stats-charts` block (inside the `hasTrips` branch)
- [ ] 5.2 Verify the toggle still issues the same HTMX request (`/partials/trip-stats?period=year&yearGranularity=<month|week>`) and the swap target is still `#stats-region`
- [ ] 5.3 Verify the toggle is hidden on phone via the new CSS rule from task 6.4 (do not add a separate render-time check; CSS handles it)

## 6. CSS: responsive grid, hero font, nav shrink, year-granularity phone hide

- [ ] 6.1 Add `.stats-hero-row { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem; }` (phone default: stacked heroes)
- [ ] 6.2 Inside `@media (min-width: 768px)`: `.stats-hero-row { grid-template-columns: 1fr 1fr; }` (desktop: heroes share a row)
- [ ] 6.3 Inside `@media (min-width: 768px)`: `.stats-grid__row { grid-template-columns: repeat(4, 1fr); }` (desktop: 4-col secondary row). Phone keeps the existing 2-col rule
- [ ] 6.4 Add `.year-granularity { display: none; }` inside the existing `@media (max-width: 768px)` block that already hides `#stats-charts`, so the year-granularity toggle is also hidden on phone
- [ ] 6.5 Inside `@media (min-width: 768px)`: drop `flex: 1` from `.period-switcher button, .year-granularity button` and add `justify-content: center` to `.period-switcher, .year-granularity` (phone keeps `flex: 1`)
- [ ] 6.6 Verify no rule conflicts with the existing `.stats-grid` (the flat 1fr grid used by the stats page today is replaced by `.stats-hero-row` + `.stats-grid__row`; the `.stats-grid` rule on the home page stays untouched)

## 7. Verification

- [ ] 7.1 Run `bun test` — all existing tests pass plus the new `totalDuration` and `totalTime` assertions
- [ ] 7.2 Run `bun dev` and visit `/stats?period=month`, `/stats?period=week`, `/stats?period=year` on desktop width: confirm two-hero row, four-secondary row, year-granularity toggle sitting above the charts
- [ ] 7.3 Resize to phone width (≤768px): confirm stacked heroes, 2-col secondary grid, hidden charts, hidden year-granularity toggle, period switcher still stretches (segmented control preserved)
- [ ] 7.4 Confirm period switcher on desktop does not stretch to container edges — buttons hug content, centered
- [ ] 7.5 Run `docker build .` — image builds with no new dependencies
