## Why

The stats page is unreachable from the home page and offers no way back. Users who learn the `/stats` URL by accident cannot navigate there naturally, and once on stats they are stranded. Navigation between home and stats must be discoverable to make the stats feature usable.

## What Changes

- Add a navigation control on the home page linking to `/stats`.
- Add a navigation control on the stats page linking back to `/`.
- Follow the existing context-aware sticky CTA pattern (no global top nav): each page owns its primary navigation affordance, consistent with the trip form's `Back` anchor and the home page's `StickyCta`.
- No backend route changes. No new dependencies. Pure view-layer addition.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `frontend-views`: new requirement for cross-page navigation controls following the existing sticky CTA / sticky-submit pattern, scoped to home and stats pages.

## Impact

- `src/frontend/pages/HomePage.tsx` — extend sticky CTA row to include a Stats link.
- `src/frontend/pages/StatsPage.tsx` — add a sticky CTA (or equivalent) with a Back-to-home link.
- `src/frontend/components/StickyCta.tsx` — may need to accept multiple actions or be composed alongside a secondary anchor.
- `public/app.css` — only if the existing sticky CTA styles do not accommodate a two-action row (Pico grid likely suffices).
- No DB, API, or dependency changes.

## Rollback

Revert the view-layer edits. No schema or data migration involved. No feature flags required.
