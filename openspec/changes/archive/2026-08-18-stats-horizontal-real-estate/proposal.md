## Why

The stats page stacks all period aggregates in a single column, wasting horizontal space on desktop and producing an unnecessarily long page. With six stats (after adding total time driven) the vertical waste gets worse. Navigation widgets also stretch to container edges on desktop, looking comically oversized. Issue #18 captures this.

## What Changes

- **Stats grid layout**: replace single-column `stats-grid` on the stats page with a hero + grid layout. Two hero cards (total distance, total time driven) and four secondary cards (avg speed, avg duration, avg consumption, trips). On phone the heroes stack full-width (one per row) and secondary cards form a 2-column grid. On desktop the heroes share a row and the four secondary cards form a single 4-column row.
- **New stat: total time driven**. Period sum of `duration_min`, rendered as `xh ym` (e.g. `6h 17m`). Sits beside total distance as a hero. Carries a delta vs. previous period like the other stats.
- **Year granularity control relocated**. Move the `[Month | Week]` selector from the top of the page to directly above the charts, since it only affects chart bucketing. Hidden on phone (charts already are).
- **Navigation widgets shrunk on desktop**. `period-switcher`, `year-granularity`, and `period-stepper` use natural button widths and center, instead of `flex: 1` stretching to container edges.
- No changes to charts layout (charts remain stacked vertically on all viewports). No phone charts.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `trip-stats`: stats page layout changes from single-column to responsive hero + grid; new `total time driven` aggregate exposed by the stats view and rendered as a hero stat; year-granularity control is relocated adjacent to the charts and hidden on phone viewports.

## Impact

- `src/frontend/fragments/StatsChartsFragment.tsx`: add hero row + secondary grid wrapper; add `StatCard` for total time; move year-granularity block below the stats grid; hide year-granularity on phone via media query.
- `src/backend/stats.tsx`: extend `StatsView.stats` with `totalTime: StatWithDelta` and `totalTimeHm: string | null`; populate from `periodAggregates`.
- `src/db/queries/stats.ts`: add `SUM(duration_min) as total_duration` to `periodAggregates`; extend `PeriodAggregates` interface with `totalDuration: number | null`. No schema migration (no new column, no new table).
- `public/app.css`: responsive grid rules, hero font scaling, nav widget shrink, year-granularity phone hide.
- Tests: `src/db/queries/stats.test.ts` and stats view tests extended to assert `totalDuration` aggregate.

## Rollback

- Revert CSS rules in `public/app.css` (single-column `stats-grid`, `flex: 1` on switchers, year-granularity at top, no phone-hide for year-granularity).
- Revert `StatsChartsFragment.tsx` to single `stats-grid` with 5 cards and top year-granularity.
- Revert `StatsView` interface and `computeStatsView` to drop `totalTime`/`totalTimeHm`.
- Revert `periodAggregates` SELECT to drop `SUM(duration_min)` and `PeriodAggregates.totalDuration`.
- All edits are additive or revertible in a single commit; no data migrations to undo.
