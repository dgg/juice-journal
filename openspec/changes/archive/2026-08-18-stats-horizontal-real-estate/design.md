## Context

Stats page currently renders five period aggregates in a single-column `stats-grid` (`grid-template-columns: 1fr`), wasting horizontal space on desktop and producing a long page. Navigation widgets (`period-switcher`, `year-granularity`, `period-stepper`) use `flex: 1` on their buttons, stretching to the Pico container edges on desktop and looking oversized. The year-granularity toggle sits at the top of the stats region despite only affecting chart bucketing. See `proposal.md` for motivation.

Existing patterns to reuse:
- `src/frontend/components/StatCard.tsx` already exposes `StatsGrid` with a hero + `stats-grid__row` (2-col) layout for the home page. The stats page has a *separate* local `StatCard` in `StatsChartsFragment.tsx` (not the shared one). The shared `StatCard` supports a `hero` prop.
- `formatDurationHm` in `src/backend/stats.tsx:111` formats minutes as `xh ym`. Reuse for total time.
- `.stats-grid__row` rule (`public/app.css:198`) is already a 2-col grid. Extend, don't reinvent.
- Existing media query at `public/app.css:410` already hides `#stats-charts` on phone; extend the same pattern to `.year-granularity`.

## Goals / Non-Goals

**Goals:**
- Use horizontal real estate on desktop for stat cards (hero row + 4-col secondary row).
- Add the total-time-driven stat as a hero alongside total distance.
- Relocate year-granularity toggle adjacent to the charts.
- Shrink navigation widgets on desktop (natural width + center).
- Keep phone usable: stacked heroes, 2-col secondary grid, no charts, no year-granularity.

**Non-Goals:**
- Side-by-side charts on desktop. Rejected in exploration — when there are many buckets (53 ISO weeks in a year), side-by-side charts become too narrow. Charts stay stacked.
- Changes to the home page `StatsGrid`. Home already does hero + row; leave it alone.
- Changes to the trip-stats query schema, the `trips` table, or migrations. Only the `SELECT` of `periodAggregates` changes.
- Changes to the chart rendering scripts (`public/scripts/charts/*.mjs`).

## Decisions

### Decision 1: Reuse the shared `StatCard` component on the stats page

The stats page currently has a local `StatCard` function inside `StatsChartsFragment.tsx` that duplicates the shared `src/frontend/components/StatCard.tsx`. Replace the local one with the shared `StatCard`. The shared component already supports `hero`, `icon`, `delta`, `deltaUnit`, `displayValue`, `period`. The local one supports the same props minus `hero` — so the shared one is a strict superset.

**Why over keeping the local one:** the shared component is what the home page uses, and the hero treatment (`stat-card--hero` class) already exists there. Duplicating the hero logic in the local fragment would re-introduce the divergence the codebase already has.

**Alternative considered:** keep both `StatCard` definitions and add a `hero` prop to the local one. Rejected — the divergence is what made this change harder than it needed to be; consolidating now is cheap and reduces future drift.

### Decision 2: Hero row wrapper vs. `grid-column: span`

Two ways to produce the hero row:

- **(a) Wrapper element**: a `.stats-hero-row` div containing the two hero `StatCard`s, separate from the `.stats-grid` (or `.stats-grid__row`) div for the four secondaries.
- **(b) Single grid with `grid-column: span 2`**: one `grid-template-columns: repeat(4, 1fr)` grid where hero cards span 2 columns each.

Choose **(a) wrapper**. Reasons:
- Phone behavior differs from desktop (phone: heroes stack full-width; desktop: heroes share a row). A wrapper that switches its own `grid-template-columns` between `1fr` and `1fr 1fr` is clearer than making hero spans conditional on viewport.
- The secondary grid has a different column count (2 on phone, 4 on desktop) from the hero row (1 on phone, 2 on desktop). Separate wrappers let each grid own its column count.
- Mirrors the home page structure (`StatsGrid` wraps a hero + a `stats-grid__row`), keeping the pattern recognizable.

**Alternative (b) rejected** because conditional `grid-column: span` requires media-query overrides on the hero cards themselves and couples the hero treatment to the grid layout.

### Decision 3: Hero font scales down on phone

The existing `.stat-card--hero .stat-card__value` rule sets `font-size: 2rem` unconditionally. On phone with heroes stacked full-width this is fine (full row to hold a 2rem value). On phone with heroes sharing a row it would be cramped — but per the user's B2 decision, heroes stack on phone (each full-width), so 2rem is preserved without a media-query override.

The hero font stays 2rem at all viewports. No new media query needed for hero font. This is a direct consequence of Decision 2's phone layout.

### Decision 4: Nav widget shrink via dropping `flex: 1` and adding `justify-content: center`

Currently `.period-switcher button, .year-granularity button { flex: 1; ... }` and `.period-stepper` is already centered. Drop `flex: 1` on the switcher buttons at tablet/desktop widths, keep it on phone. Add `justify-content: center` to the switcher containers (already has `display: flex`). Cap nothing with `max-width` — natural width + center is enough because the buttons are short (`Week`, `Month`, `Year` + icon).

`.period-stepper` is already centered and uses natural-width steppers; the picker already has `max-width: 14rem`. No change needed for the stepper. Only the switcher and granularity toggle need the `flex: 1` removal.

Implementation: scope the `flex: 1` removal inside `@media (min-width: 768px)` so phone keeps the stretched segmented control.

### Decision 5: Total time query is additive

`periodAggregates` in `src/db/queries/stats.ts:27` runs two query branches (with/without `vehicleId`). Add `SUM(duration_min) as total_duration` to both branches. Add `totalDuration: number | null` to `PeriodAggregates`. Mirror the existing `toNumber` + `totalDistance !== null ? tripCount : null` guard pattern: total time is null iff `totalDistance` is null (no trips), keeping the empty-period semantics consistent.

No new column, no migration. `duration_min` is already a `trips` column. The `dbmate` migration inventory is untouched.

### Decision 6: `StatsView` carries `totalTime: StatWithDelta` and `totalTimeHm: string | null`

Mirror the existing `avgDuration` / `avgDurationHm` pair. `formatDurationHm` is reused verbatim. The previous-period `totalDuration` flows through the existing `prevStats` query, so the delta comes for free.

## Risks / Trade-offs

- **[Risk] Stat card markup divergence between local and shared `StatCard`.** The local one renders `<data value={...}>` inside `.stat-card__value` and a `Delta` component — same structure as the shared one. Visual parity should hold. Mitigation: the `StatsChartsFragment` test (`navigation.test.tsx`) asserts structure; if it breaks on the swap, the diff will surface.
- **[Risk] Hero row on phone with 2rem font could overflow on very narrow viewports (≤320px) when the value is long (e.g. `1,234 km`).** Mitigation: 2rem on a 320px viewport fits 4-5 chars at default Pico spacing; `1,234 km` is 7 chars and may wrap. The existing hero on the home page has the same exposure and has not been reported as broken. If it surfaces, add a `font-size: 1.5rem` override inside `@media (max-width: 360px)`. Out of scope for this change unless testing reveals a problem.
- **[Trade-off] Hiding the year-granularity toggle on phone means a phone user viewing the year period cannot change chart bucketing.** Accepted: charts are also hidden on phone, so the toggle would have no visible effect. The toggle reappears at tablet width where charts reappear.
- **[Trade-off] Relocating the year-granularity toggle below the stats grid means it is no longer visually adjacent to the period switcher.** Accepted and intended: the toggle only affects charts, so sitting next to the charts makes the causal relationship clearer. The period switcher still controls the period itself.
- **[Risk] Dropping `flex: 1` on the period switcher at desktop could leave the switcher visually floating with no surrounding context.** Mitigation: `justify-content: center` keeps it centered. The segmented-control shape (shared border-radius, no gap) is preserved by the existing `:first-child`/`:last-child` border-radius rules.

## Migration Plan

Single-direction, additive change. No data migration.

Deploy steps:
1. Ship query change (`SUM(duration_min)`) — additive, no breakage.
2. Ship `StatsView` interface + `computeStatsView` extension — additive.
3. Ship frontend changes (`StatCard` swap, hero row wrapper, secondary grid, year-granularity relocation, CSS).
4. Ship CSS nav widget shrink.

Rollback: revert the commits. No data to back-fill, no schema to undo. See `proposal.md` Rollback section.
