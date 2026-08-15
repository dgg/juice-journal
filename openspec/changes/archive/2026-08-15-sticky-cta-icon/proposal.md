## Why

The `StickyCta` component already declares an optional `icon` property on each action but never renders it (see `src/frontend/components/StickyCta.tsx:7` — `icon?: string` is unused). Issue #15 asks the sticky CTA to render the named icon when populated, perfectly sized and aligned with the label text. Wiring up the already-declared property gives pages a low-effort way to add visual affordances to navigation actions without new dependencies.

## What Changes

- Render an optional icon inside each `StickyCta` action anchor when `icon` is provided, placed before the label.
- Use the project's existing icon system: `lucide-static` font icons applied as `<span class="icon-<name>" aria-hidden="true"></span>`, matching the pattern already used by `TripRow` (`icon-clock-8`/`icon-clock-4`) and `StatsChartsFragment` (`icon-move-left`/`icon-move-right`).
- Add CSS in `public/app.css` (scoped to `.sticky-cta`) so the icon is vertically centered with the label and sized to match the button text — no inline `<style>`.
- Leave actions without `icon` unchanged (icon is optional).
- No new dependencies; `lucide-static@1.31.0` is already loaded in `Layout.tsx`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `frontend-views`: the sticky CTA navigation requirement gains an optional per-action icon that renders inline with the label when populated.

## Impact

- **Code:** `src/frontend/components/StickyCta.tsx` (render path), `public/app.css` (icon sizing/alignment within `.sticky-cta`). No backend, route, or data changes.
- **Callers:** `HomePage.tsx` and `StatsPage.tsx` render `StickyCta` but currently pass no `icon`; they keep working unchanged. Pages may now pass an `icon` value.
- **Dependencies:** none added or upgraded.
- **Tests:** `src/frontend/__tests__/navigation.test.tsx` covers `StickyCta`; add assertions that an icon span renders when `icon` is provided and is absent when omitted.

## Rollback

Revert the `StickyCta.tsx` render change and the `.sticky-cta` icon rules in `public/app.css`. The `icon?: string` property can remain on the `Action` type (it is already present and optional), so callers passing an `icon` keep type-checking — they just no longer render it. No migration or data cleanup is required.
