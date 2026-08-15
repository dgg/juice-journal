## Context

The shared `EmptyState` component (`src/frontend/components/EmptyState.tsx`) renders `<p class="empty-state">No trips yet — log your first commute</p>` with no props. It is used in three places: `HomePage.tsx`, `TripListFragment.tsx` (both "no trips" contexts), and `StatsChartsFragment.tsx` (a "no stats" context that currently reuses the trips message). The project renders icons via the `lucide-static@1.31.0` font loaded in `Layout.tsx` using `<span class="icon-<name>" aria-hidden="true"></span>` (established by `TripRow`, `StickyCta`, `StatsChartsFragment`). No backend, route, query, or data model is involved.

## Goals / Non-Goals

**Goals:**
- Render a `circle-off` `lucide-static` font icon inline with the empty-state text in every `EmptyState` render.
- Make the message text parameterizable so the stats context can show a "no stats" message distinct from the home-page "No trips yet — log your first commute" message.
- Keep the existing home-page / trip-list callers working without changes (default message preserved).

**Non-Goals:**
- Changing when the empty state is shown (the `hasTrips` gating logic is untouched).
- Adding icons to stat cards, the period label, or the trip rows.
- Validating icon names against the lucide set (an unknown name renders a blank glyph, same as elsewhere).

## Decisions

### 1. Add an optional `message` prop to `EmptyState`, defaulting to the existing trips message

`type EmptyStateProps = { message?: string }`. Default `message = "No trips yet — log your first commute"`. This keeps `HomePage` and `TripListFragment` callers unchanged (`<EmptyState />`), while letting the stats caller pass a distinct message.

**Alternatives considered:**
- A required `message` prop + update all callers: more churn for no behavioral gain; the default preserves the existing trips wording exactly.
- Two separate components (`TripsEmptyState` / `StatsEmptyState`): over-engineered for one shared icon + a string.

### 2. Render the icon as a `lucide-static` font span before the message text

Use `<span class="icon-circle-off" aria-hidden="true"></span>` before `{message}`, matching the in-app pattern. The lucide font is already loaded globally in `Layout.tsx`.

**Alternatives considered:**
- Inline SVG: diverges from the established font-icon pattern.
- Emoji (e.g., ⊘): inconsistent across platforms, no color control.

### 3. Use a "no stats" message for the stats empty state

`StatsChartsFragment` passes `message="No stats for this period"` to `EmptyState`. This clearly distinguishes the stats empty state from the trips empty state, per issue #15 ("no trips or no stats").

**Alternatives considered:**
- Reuse the trips message in stats: rejected — issue #15 explicitly distinguishes the two contexts.

### 4. Lay out icon + text via flexbox on `.empty-state`, scoped in `public/app.css`

Add `display: inline-flex; align-items: center; gap: 0.4rem` to `.empty-state` (changing it from a bare `<p>` to an inline-flex container) and size the icon with `[class^="icon-"] { font-size: <text size> }`. Follows the AGENTS.md styling order: no Pico class exists for this, so a scoped custom rule in `public/app.css` is the last-resort path.

**Alternatives considered:**
- `vertical-align` on the icon span: brittle across line-box metrics.
- Inline `<style>`: forbidden by AGENTS.md.

## Risks / Trade-offs

- **[Changing `.empty-state` to inline-flex could affect existing centering]** → Mitigation: check the current `.empty-state` CSS; if it uses `text-align: center`, preserve centering via `justify-content: center` on the inline-flex.
- **[Icon name typo renders blank]** → Mitigation: the icon name is a single literal in the component; an unknown lucide name is a no-op glyph, consistent with the rest of the app.
- **[Default message drift]** → Mitigation: keep the default string byte-for-byte identical to the current text so existing home-page tests still pass.

## Migration Plan

Add the icon span and optional `message` prop to `EmptyState.tsx`, pass a stats message from `StatsChartsFragment.tsx`, and add the scoped CSS in `public/app.css`. Rollback is a revert of those three files — no data migration, no API change.
