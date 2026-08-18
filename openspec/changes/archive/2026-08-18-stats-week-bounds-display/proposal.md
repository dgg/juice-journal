## Why

The stats page renders a period label (e.g. "August 2026", "2026", "W34 2026") next to the car icon. That information is already conveyed by the period switcher and the period navigation picker, so it is duplicated. Week labels ("W34 2026") are additionally opaque — most users cannot map an ISO week number to actual calendar dates, so the label is both redundant and unhelpful in week mode.

## What Changes

- Remove the period label text (`data.label`) from the `stats-period-label` block in `StatsChartsFragment` for the `month` and `year` periods. In those modes the block SHALL render only the car icon plus the vehicle description (when a vehicle exists).
- In `week` mode, replace the period label with a human-readable week-bounds string of the form `dd MMM – dd MMM` (e.g. `18 Aug – 24 Aug`), computed from the ISO week bounds in the display timezone. The car icon and vehicle description remain.
- The period label (`data.label`) stays available in the `StatsView` for other consumers (e.g. the page `<title>`/header) — only the fragment rendering changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-stats`: the stats region's period-label rendering requirement changes — month/year show only the car; week shows week bounds instead of the period label.

## Impact

- `src/frontend/fragments/StatsChartsFragment.tsx` — `stats-period-label` block rendering becomes period-conditional.
- `src/backend/stats.tsx` — `computeStatsView` SHALL expose a week-bounds label (e.g. `weekBoundsLabel`) on `StatsView` for the week period, derived from the existing `periodBoundsUtc` week bounds in the display timezone.
- `StatsView` type (shared between `StatsPage.tsx` and `StatsChartsFragment.tsx`) gains an optional `weekBoundsLabel` field.
- `src/frontend/pages/StatsPage.tsx` — `StatsView` interface updated.
- `src/frontend/__tests__/stats-charts.test.tsx` — assertions for the period-label rendering updated.
- No DB schema, API, or dependency changes.

### Rollback

Revert the fragment rendering to show `data.label` unconditionally and drop the `weekBoundsLabel` field. No data migration is involved.
