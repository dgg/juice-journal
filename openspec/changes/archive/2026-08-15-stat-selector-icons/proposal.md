## Why

The stats page period switcher (week/month/year) and year-granularity toggle (Month/Week) render as plain text buttons. Issue #15 asks each selector to carry a `lucide-static` calendar icon sized and aligned with its label — `calendar-1` for week, `calendar-days` for month, `calendar` for year — so the active period is recognizable at a glance.

## What Changes

- Add an icon span before the label in each period-switcher button: `week` → `calendar-1`, `month` → `calendar-days`, `year` → `calendar`.
- Add an icon span before the label in each year-granularity button using the same mapping (`month` → `calendar-days`, `week` → `calendar-1`) for visual consistency with the period switcher.
- Add scoped CSS in `public/app.css` so the icon is vertically centered with the label and sized to match the button text, without breaking the existing segmented-button layout (flex:1, shared border-radius).
- No new dependencies; `lucide-static@1.31.0` is already loaded in `Layout.tsx`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `trip-stats`: the period-selection requirement gains per-button icons rendered inline with each period label; the year-granularity toggle gains matching icons.

## Impact

- **Code:** `src/frontend/fragments/StatsChartsFragment.tsx` (period switcher + year-granularity button render paths), `public/app.css` (icon sizing/alignment within `.period-switcher`/`.year-granularity`). No backend, route, query, or data changes.
- **Dependencies:** none added or upgraded.
- **Tests:** `src/frontend/__tests__/stats-charts.test.tsx` covers `StatsChartsFragment`; add assertions that each period button renders the expected `icon-<name>` class.

## Rollback

Revert the `StatsChartsFragment.tsx` button render changes and the icon rules added to `.period-switcher`/`.year-granularity` in `public/app.css`. No migration or data cleanup is required; the HTMX swap behavior and period semantics are untouched.
