## Why

The stats page only ever shows the current period (this week, this month, this year). Users cannot view past periods — no way to see July's stats, or 2025's. Previous-period deltas are glued to "now," so the feature is frozen in time. Temporal navigation is the missing piece that makes stats actually useful.

## What Changes

- Add a date-anchored period navigation control to the stats page: a native picker (`<input type="week">` / `<input type="month">` / `<select>` for year) flanked by ◀/▶ stepper buttons.
- Both controls manipulate a single `date` query parameter. No separate offset — the stepper rewrites the date to the adjacent period.
- The server computes period bounds and previous-period deltas relative to the anchor date, not `DateTime.now()`. Reuse `computeStatsView` and `periodBoundsUtc` unchanged — they already accept `now`.
- The ◀/▶ adjacent dates are precomputed server-side into button hrefs on every render, so the controls stay in sync after each HTMX swap with zero client JS.
- The ▶ button is disabled when the anchor period reaches the current period (no future navigation).
- Clearing the picker resets to the current period (anchor = now).
- Year granularity toggle (month/week) persists across navigation.
- Remove the three prototype routes (`/stats/offset`, `/stats/ref-date`, `/stats/offset-and-ref`) and their prototype-only fragments/pages.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-stats`: extends period selection with temporal navigation — the user can view any past period via a date-anchored picker/stepper, not just the current period. Previous-period deltas follow the selected anchor.

## Impact

- `src/backend/stats.tsx` — parse `date` query param, compute anchor DateTime, pass as `now` to `computeStatsView`. Remove prototype handlers.
- `src/frontend/fragments/StatsChartsFragment.tsx` — replace static period label with picker + stepper nav control. Remove prototype fragment.
- `src/frontend/pages/StatsPage.tsx` — remove prototype page imports.
- `src/backend/index.ts` — remove prototype routes.
- `src/frontend/fragments/StatsPrototypeFragment.tsx` — delete.
- `src/frontend/pages/StatsPrototypePage.tsx` — delete.
- `public/app.css` — `.period-stepper`, `.period-picker` styles (already prototyped).
- No DB, query, or dependency changes. `periodBoundsUtc` and `statsQueries` are reused as-is.

## Rollback

Revert the view-layer and handler edits. No schema or data migration. Remove `date` query param handling — `computeStatsView` defaults to `DateTime.now()` unchanged. No feature flags required.
