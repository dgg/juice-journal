## Context

Today each page owns its primary action via a sticky bottom control:
- Home (`src/frontend/pages/HomePage.tsx`) uses `StickyCta` with a single anchor to `/trips/new`.
- Trip form (`src/frontend/pages/TripFormPage.tsx`) uses `.sticky-submit` with a Pico grid row holding a `Back` anchor plus a submit button.
- Stats (`src/frontend/pages/StatsPage.tsx`) has no sticky control and no link back to home.

`StickyCta` currently accepts one `{ href, label }`. The trip form's `.sticky-submit` already demonstrates a two-action grid row pattern (Pico `<div class="grid">` with anchor + button). `Layout` sets `hx-boost="true"` on `<body>`, so any plain anchor inherits SPA-style navigation for free.

## Goals / Non-Goals

**Goals:**
- Make `/stats` reachable from home and `/` reachable from stats using the existing sticky CTA pattern.
- Reuse the two-action grid row already proven by `.sticky-submit` rather than inventing a new pattern.
- Keep the change view-layer only: no backend, no DB, no new dependencies.

**Non-Goals:**
- No global top navigation bar (per explore-mode decision: few future pages, sticky CTA matches current pattern).
- No changes to the trip form page.
- No period selection, no stats query parametrization (separate change).
- No new CSS framework or component library.

## Decisions

### Decision 1: Extend `StickyCta` to accept multiple actions

Generalize `StickyCta` from a single `{ href, label }` to an array of actions, rendering each as a Pico `role="button"` anchor inside a `.sticky-cta > .grid` row. The existing `.sticky-cta` CSS rule already anchors the container to the viewport bottom; the inner `.grid` reuses Pico's grid utility (same as `.sticky-submit`).

Alternatives considered:
- **Compose two `StickyCta` instances side by side** — rejected: duplicates the sticky container, risks double bottom padding / overlapping fixed positioning.
- **A new `StatsNav` component** — rejected: duplicates the sticky CTA pattern unnecessarily; one generalized component covers both pages.
- **Inline the anchors directly in each page** — rejected: violates the existing atom convention (frontend-views spec requires reusable atoms for repeated patterns).

Backward compatibility: `StickyCta` keeps the single-action shape working by treating a single action as a one-item grid (Pico grid with one cell renders fine). Callers passing the old single-action shape continue to render correctly.

### Decision 2: Stats page gets a `StickyCta` with a single Back-to-home action

Stats has only one navigation target (home), so a single-action `StickyCta` suffices. The label will read "Back to home" to match the semantic intent of the trip form's `Back` anchor while being explicit about the destination (stats is not a sub-flow of home the way the trip form is).

### Decision 3: Home page CTA row holds Stats + Log new trip

Home keeps its existing "Log new trip" primary action and adds "Stats" as a secondary action in the same `.sticky-cta > .grid` row. Pico's `secondary` class on the stats anchor visually de-emphasizes it relative to the `contrast` log-trip anchor, preserving the existing primary CTA hierarchy.

### Decision 4: No new CSS unless the grid row breaks the existing `.sticky-cta` layout

`.sticky-cta` currently styles the container and its `button` descendants. Adding a `.grid` child should work with Pico's grid defaults. If the grid renders with unexpected gaps or alignment, a small scoped addition to `public/app.css` under `.sticky-cta .grid` is permitted as the last-resort styling tier per the frontend-views stylesheet contract. No inline styles.

## Risks / Trade-offs

- **Two anchors in `.sticky-cta` may collide with existing `.sticky-cta button` CSS** → The current rule targets `button` descendants, not anchors; the existing single-action `StickyCta` uses `<a role="button">` and is not styled by that rule, so adding a second anchor should be safe. Verify visually after implementation.
- **Generalizing `StickyCta` touches a component with one existing caller** → Low blast radius (only `HomePage`). The trip form uses its own `.sticky-submit` markup, not `StickyCta`, so it is unaffected.
- **`hx-boost` on body should make anchors SPA-nav automatically** → If a full reload occurs, check that the anchors are not inside a form element (they are not) and that `hx-boost` is not disabled on the container.

## Migration Plan

1. Generalize `StickyCta` to accept `actions: Array<{ href: string; label: string; variant?: "contrast" | "secondary" }>` (single action still works).
2. Update `HomePage` to pass two actions: Stats (secondary) + Log new trip (contrast).
3. Add `StickyCta` to `StatsPage` with one action: Back to home (contrast).
4. Verify visually: both pages render sticky CTAs at the bottom, navigation works with `hx-boost`, no layout regression.
5. Rollback: revert the three view edits. No data or config to undo.

## Open Questions

- Should the stats page CTA also expose "Log new trip" for symmetry with home? Deferred — stats is an analytics view, logging belongs to home/form. Can revisit if users report friction.
