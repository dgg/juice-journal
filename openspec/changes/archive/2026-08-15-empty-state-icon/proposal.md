## Why

The shared `EmptyState` component renders a plain text line (`<p class="empty-state">No trips yet — log your first commute</p>`) with the same message in both the home page (no trips) and the stats page (no stats). Issue #15 asks it to carry a `lucide-static` `circle-off` icon plus context-appropriate text so the empty state is visually distinct and clearly identifies whether there are no trips or no stats.

## What Changes

- Render a `circle-off` `lucide-static` font icon inside the `EmptyState` component, inline with the text.
- Make the message text parameterizable via an optional `message` prop so callers can distinguish "no trips" from "no stats". Keep the existing "No trips yet — log your first commute" as the default (backward-compatible for the home page / trip list callers).
- Pass a "no stats" message from the stats context (`StatsChartsFragment`) so the stats empty state reads differently from the trips empty state.
- Add scoped CSS in `public/app.css` (`.empty-state`) so the icon is vertically centered with the text and sized to match the message text.
- No new dependencies; `lucide-static@1.31.0` is already loaded in `Layout.tsx`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `home-page-ssr`: the empty-state requirement gains a `circle-off` icon rendered inline with the (unchanged) "No trips yet" message.
- `trip-stats`: the empty-chart-state requirement gains a `circle-off` icon and a "no stats" message distinct from the trips empty state.

## Impact

- **Code:** `src/frontend/components/EmptyState.tsx` (add icon + optional message prop), `src/frontend/fragments/StatsChartsFragment.tsx` (pass "no stats" message), `public/app.css` (icon sizing/alignment within `.empty-state`). No backend, route, query, or data changes.
- **Callers:** `HomePage.tsx`, `TripListFragment.tsx` continue to render `<EmptyState />` with no args (default trips message). `StatsChartsFragment.tsx` passes a stats-specific message.
- **Dependencies:** none added or upgraded.
- **Tests:** add assertions that the `circle-off` icon renders and that a custom message renders when provided.

## Rollback

Revert the `EmptyState.tsx` render change, the `StatsChartsFragment.tsx` call-site change, and the `.empty-state` icon rules in `public/app.css`. The optional `message` prop can remain on the type (it is optional), so callers passing a message keep type-checking — they just no longer render the icon. No migration or data cleanup is required.
