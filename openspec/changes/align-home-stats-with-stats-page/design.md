## Context

The stats page already has a hero + grid layout inlined in `StatsChartsFragment` (`src/frontend/fragments/StatsChartsFragment.tsx:178-273`): two hero cards (total distance, total time driven) over a four-card grid row (avg speed, avg duration, avg consumption, trip count). The home page uses a different, simpler `StatsGrid` component (`src/frontend/components/StatCard.tsx:48-102`) with one hero (avg consumption) and a two-card row (avg duration, total distance). Same `periodAggregates` query feeds the stats page and is available to the home page; the home page currently calls the back-compat `monthlyAggregates` alias that drops three of the six aggregates. See proposal.md for why we are aligning them.

The `formatHm` helper at `src/backend/stats.tsx:115-121` formats minutes as `xh ym` / `xh` / `ym` and is file-local; the home page handler cannot reach it today.

## Goals / Non-Goals

**Goals:**

- Single source of truth for the hero + grid stats summary markup — the home page and the stats page render the same panel for the current month.
- Home page exposes all six aggregates already produced by `periodAggregates`, with month-over-month deltas on every card.
- Reuse the existing `StatCard`, `Delta`, and Pico CSS classes (`.stats-hero-row`, `.stats-grid__row`, `.stat-card--hero`) — no new CSS rules needed for the layout itself.

**Non-Goals:**

- No period selection, period navigation, or `date` parameter on the home page — it stays month-scoped.
- No charts, no Chart.js, no `stats.mjs` on the home page.
- No DB schema change, no new SQL query, no new dependency.
- No change to the stats page behavior or the `trip-stats` spec — its hero + grid layout requirement remains the canonical description.

## Decisions

### Decision 1: Extract a `StatsSummaryGrid` fragment shared by both pages

**Choice.** Pull the hero + grid JSX block (the two hero cards + four grid-tier cards, with delta computation) out of `StatsChartsFragment` into a new `src/frontend/fragments/StatsSummaryGrid.tsx`. The fragment accepts a `StatsSummary` view-model:

```ts
interface StatWithDelta { value: number | null; prev: number | null }
interface StatsSummary {
  totalDistance:    StatWithDelta
  totalTime:        StatWithDelta
  totalTimeHm:      string | null
  avgSpeed:         StatWithDelta
  avgDuration:      StatWithDelta
  avgDurationHm:    string | null
  avgConsumption:   StatWithDelta
  tripCount:        StatWithDelta
  period: "week" | "month" | "year"   // drives the delta suffix
}
```

`StatsChartsFragment` renders `<StatsSummaryGrid data={summary} />` followed by the year-granularity toggle and chart region. The home page renders `<StatsSummaryGrid data={summary} />` directly with `period: "month"`.

The shared fragment computes each delta inline (current minus previous, neutral when either is null) — the same arithmetic `StatsChartsFragment` does today — and passes the `period` through to `Delta` so the suffix reads `vs last month` on the home page and `vs last week` / `vs last month` / `vs last year` on the stats page.

**Alternatives considered.**

- *Duplicate the JSX in the home page.* Rejected: two copies of the same six-card layout drift; the spec explicitly wants one shared component.
- *Generalize `StatsGrid` to take all six stats.* Rejected: `StatsGrid` is consumed by the partial `StatsFragment` (the `GET /partials/stats` route), which we are also migrating; replacing both with the new fragment is cleaner than a third signature on `StatsGrid`.
- *Reuse `StatsChartsFragment` with a flag that hides the charts.* Rejected: couples the home page to Chart.js script tags and the period switcher; spec requires the home page NOT include those.

### Decision 2: Switch `homeHandler` from `monthlyAggregates` to `periodAggregates`

**Choice.** `homeHandler` (`src/backend/home.tsx:67-77`) calls `statsQueries.monthlyAggregates`, which is a back-compat alias that returns only `{ avgConsumption, avgDuration, totalDistance }`. Switch to `statsQueries.periodAggregates`, which already returns `{ avgConsumption, avgDuration, totalDistance, totalDuration, avgSpeed, tripCount }` from the same SQL — no query change, just unpacking more columns.

The `HomeData.stats` type expands to the six `StatWithDelta` fields plus `totalTimeHm` and `avgDurationHm`. The handler computes the `*Hm` strings by calling `formatHm(totalDuration)` and `formatHm(avgDuration)`.

**Alternatives considered.**

- *Add a new `homeAggregates` query that returns the six fields.* Rejected: `periodAggregates` already does this; a new query would duplicate SQL.
- *Leave `monthlyAggregates` and add the missing fields to it.* Rejected: `monthlyAggregates` is documented as a back-compat alias; extending it defeats the alias's purpose and risks breaking other future callers that rely on the 3-field shape.

### Decision 3: Move `formatHm` to `src/utils/format.ts`

**Choice.** Lift the file-local `formatHm(minutes: number | null): string | null` from `src/backend/stats.tsx:115-121` into `src/utils/format.ts` (new file, sibling of `src/utils/dates.ts`). Both `stats.tsx` and `home.tsx` import it. The function signature and behavior are unchanged: `null` → `null`, `0m` → `0m`, `120` → `2h`, `90` → `1h 30m`, `45` → `45m`.

**Alternatives considered.**

- *Duplicate `formatHm` in `home.tsx`.* Rejected: drift risk; the spec requires the home page formatting rules to be identical to the stats page.
- *Put it on `src/utils/dates.ts`.* Rejected: `dates.ts` is about time-zone and period-bounds arithmetic, not human-readable formatting; a separate `format.ts` keeps the concerns clean and leaves room for future format helpers.

### Decision 4: Rewrite `StatsFragment` to delegate to `StatsSummaryGrid`

**Choice.** The `GET /partials/stats` route (`src/backend/html-handlers.tsx:104-144`) currently calls `statsQueries.monthlyAggregates` and renders `<StatsFragment>` (which wraps `StatsGrid`). Migrate the handler to `statsQueries.periodAggregates`, build the same `StatsSummary` view-model the home page builds (with `period: "month"`), and render `<StatsSummaryGrid data={summary} />` directly. `StatsFragment.tsx` and `StatsGrid` (in `StatCard.tsx`) are deleted — no remaining callers.

The `hx-swap-oob="true"` out-of-band refresh after `POST /trips` continues to target the same `#stats-region` (or whatever the home page wraps the panel in); the fragment is just richer.

**Alternatives considered.**

- *Keep `StatsFragment` as a thin wrapper around `StatsSummaryGrid`.* Rejected: a one-line wrapper around a single component adds indirection without value.
- *Leave `StatsGrid` in place for the partial.* Rejected: the partial is precisely the home page's stats panel; it must render the same six cards.

### Decision 5: No `app.css` changes

**Choice.** The existing `.stats-hero-row`, `.stats-grid__row`, `.stat-card`, `.stat-card--hero`, and `.stat-card--hero[data-empty]` rules already cover both layouts and all breakpoints (mobile: 1-col heroes + 2-col grid; ≥768px: 2-col heroes + 4-col grid). The home page simply uses these classes via the shared fragment — no new selectors, no overrides.

**Alternatives considered.**

- *Add a home-page-specific modifier.* Rejected: would diverge the layouts the spec requires to be identical.

## Risks / Trade-offs

- **[Risk] `hx-swap-oob` target selector may need updating** if the home page wraps `StatsSummaryGrid` in a different container than `StatsChartsFragment` does. → Mitigation: keep the same wrapper element id on the home page (`#stats-region` or equivalent) so the OOB swap after `POST /trips` targets the right node; covered as a task with a manual smoke test.
- **[Risk] Test snapshots break** — `src/backend/home.test.ts` and any contract tests asserting the 3-stat panel. → Mitigation: tasks include updating those tests in the same change; no production deploy until tests pass.
- **[Risk] `monthlyAggregates` alias has other unseen callers.** → Mitigation: grep for `monthlyAggregates` across the repo before deleting; if other callers exist, leave the alias in place (it costs nothing) and only switch `homeHandler` and `getPartialStats`.
- **[Trade-off] The home page panel becomes denser.** Six cards instead of three means smaller tap targets on phone for the grid row. The stats page already accepts this trade-off (same 2-col phone grid); staying consistent is the goal.
- **[Trade-off] Removing `StatsGrid` and `StatsFragment` touches more files than strictly necessary.** Accepted: leaving dead 3-stat components would invite future drift and confuse readers about which panel is canonical.

## Migration Plan

1. Land the change on a feature branch (`feat/align-home-stats`).
2. Run `bun test` and `docker build .` per the contributing checklist.
3. Deploy: single container image, no DB migration, no env var change.
4. Smoke-test the home page on phone and desktop: six cards render, deltas read `vs last month`, charts absent.
5. Smoke-test `POST /trips`: OOB swap refreshes the stats panel without a full reload.

## Rollback

Revert the commit. `StatsGrid`, `StatsFragment`, and the file-local `formatHm` are preserved in git history; `monthlyAggregates` alias is left in place (or restored). No data migration to undo, no schema change, no env var. The revert is a pure presentation-layer rollback.

## Open Questions

None. The layout, data source, shared component, and CSS reuse are all decided.
