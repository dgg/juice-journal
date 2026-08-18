## Why

The home page stats panel renders only three values (avg consumption hero, avg duration + total distance in a 2-card row) and looks sparse on desktop — a single hero card stretches across the full width and the row of two leaves wide gaps. The stats page already ships a denser, balanced layout (two hero cards + one four-card row) covering six aggregates. Users see two different dashboards for the same data depending on which page they land on. Aligning the home page to the stats page layout removes the inconsistency, fills desktop real estate, and surfaces three additional metrics (total time, avg speed, trip count) with month-over-month deltas — all already computed by the existing `periodAggregates` query.

## What Changes

- Home page stats panel switches from `StatsGrid` (3 values, 1 hero + 2-card row) to the same hero + grid layout used by `/stats`: two hero cards (total distance, total time driven) over a single four-card row (avg speed, avg duration, avg consumption, trip count).
- Home page stat data shape expands from 3 fields (+prev) to 6 fields (+prev), plus the `totalTimeHm` and `avgDurationHm` human-readable strings already produced for the stats page.
- `homeHandler` switches from `statsQueries.monthlyAggregates` (back-compat alias returning 3 fields) to `statsQueries.periodAggregates` (already returns all 6 aggregates) — no DB or schema change.
- A new shared `StatsSummaryGrid` fragment (hero + grid, no charts, no switcher) is extracted from the inlined JSX in `StatsChartsFragment`. Both pages consume it; the stats page wraps it with the period switcher, navigation, and charts.
- The `formatHm` helper currently file-local to `src/backend/stats.tsx` is moved to `src/utils/format.ts` so both handlers can format durations identically.
- Home page stays month-scoped (no period selection, no `date` parameter). Deltas compare current calendar month to the previous calendar month — `vs last month` suffix and trend icons behave as today.
- The `GET /partials/stats` fragment route is updated to return the new shared summary grid markup (same expanded stats shape) so out-of-band HTMX swaps after trip creation refresh the same panel.
- `StatsGrid` and `StatsFragment` (the old 3-value versions) are removed; no remaining caller after home page switches. The mobile partial `getPartialStats` migrates to the shared fragment.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `home-page-ssr`: the stats panel requirement expands from three aggregates to six, adopts the hero + grid layout already specified in `trip-stats`, and the `/partials/stats` fragment returns the new shared summary grid markup.

## Impact

- **Code:** `src/frontend/pages/HomePage.tsx`, `src/backend/home.tsx`, `src/frontend/fragments/StatsFragment.tsx` (rewritten as the shared `StatsSummaryGrid`), `src/frontend/fragments/StatsChartsFragment.tsx` (delegates to shared fragment), `src/backend/html-handlers.tsx` (`getPartialStats`), `src/frontend/components/StatCard.tsx` (`StatsGrid` removed), `src/utils/format.ts` (new `formatHm`).
- **Specs:** `home-page-ssr` requirement updated. `trip-stats` spec unchanged — its hero + grid layout requirement becomes the canonical source the home page references.
- **Dependencies:** None. No new libraries; uses existing `StatCard`, `Delta`, and Pico CSS classes already in `public/app.css`.
- **APIs:** No public API change. `/partials/stats` response body changes shape (6 stats instead of 3) but the route and contract remain HTML-fragment-only — not a breaking API change.
- **Tests:** `src/backend/home.test.ts` and any snapshot/contract tests asserting the 3-stat panel updated to expect 6 stats and the new layout.
- **Rollback:** Revert the commit. The old `StatsGrid` and `StatsFragment` remain in git history; `monthlyAggregates` alias stays available. No data migration, no schema change, no env var change — pure presentation layer revert.
