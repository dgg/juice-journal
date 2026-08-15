## Why

Issue #15 asks the per-stat delta indicator (the "vs last period" line under each stat on the home and stats pages) to carry a trend icon — `trending-up` when the current value is larger than the previous, `trending-down` when smaller, `trending-up-down` when equal. The shared `Delta` component (`src/frontend/components/Delta.tsx:11`) already color-codes the sign but hard-codes the suffix `vs last month`. On the stats page that suffix is wrong for week and year periods: it reads "vs last month" no matter which period is selected. Wiring the period into the label and adding the trend icon closes the last item from issue #15 and fixes a real correctness bug at the same time.

## What Changes

- Add a `period` prop to the `Delta` component (`"week" | "month" | "year"`, default `"month"` for the home page) so the suffix renders `vs last week` / `vs last month` / `vs last year` matching the period the delta was computed for.
- Render a `lucide-static` trend icon inline before the delta value, driven by the sign of `value`: `trending-up` when `value > 0`, `trending-down` when `value < 0`, `trending-up-down` when `value === 0`. The icon reuses the existing `<span class="icon-<name>" aria-hidden="true"></span>` pattern; no new dependency (lucide-static@1.31.0 already loaded).
- Keep the existing color coding (`positive` / `negative` / neutral class on the `.delta` element) and the `+` sign on positive deltas — the icon is additive, color stays the source of truth for direction.
- Wire the stats page to pass `data.period` into its local `StatCard` -> `Delta` path (the `StatsChartsFragment` `StatCard` calls `<Delta value={delta} unit={unit} />` today without a period).
- Wire the home page to pass `"month"` explicitly through `StatsGrid` -> `StatCard` -> `Delta` so the suffix stays `vs last month` (no behavior change for the home page; just makes the period explicit).
- Add CSS in `public/app.css` (scoped to `.delta`) so the trend icon is vertically centered with the delta text and sized to match — no inline `<style>`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `trip-stats`: the previous-period delta requirement gains a period-aware suffix label and a trend-direction icon.
- `home-page-ssr`: the home-page MoM delta requirement gains the same trend-direction icon (suffix already correct as `vs last month`, made explicit via the `period` prop).

## Impact

- **Code:** `src/frontend/components/Delta.tsx` (period prop + icon rendering), `src/frontend/components/StatCard.tsx` (forward `period` from `stat` to `Delta`), `src/frontend/fragments/StatsChartsFragment.tsx` (forward `data.period` into the local `StatCard` -> `Delta` path), `public/app.css` (icon sizing/alignment inside `.delta`). No backend, route, query, or data changes — the period is already available in every render path that produces a delta.
- **Callers:** `HomePage.tsx` (via `StatsGrid`) and `StatsPage.tsx` (via `StatsChartsFragment`) — both keep their existing props; the period is derived from data already on hand. `navigation.test.tsx` and any existing delta render assertions get new cases for the icon and the suffix.
- **Dependencies:** none added or upgraded; `lucide-static@1.31.0` already in `Layout.tsx`.
- **Tests:** add unit tests for `Delta` covering the three icon branches and the three suffix strings; add assertions in stats-page render tests that the suffix matches the selected period.

## Rollback

Revert `Delta.tsx`, `StatCard.tsx`, `StatsChartsFragment.tsx`, and the `.delta` CSS rules in `public/app.css`. The `period` prop can remain optional on `Delta` with its default of `"month"` so callers continue to type-check even if they pass it. No migration or data cleanup is required; the suffix change is render-only.
