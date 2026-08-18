## Why

The expanded trip detail body uses a stacked 2-column definition list (`grid-template-columns: auto 1fr`) that wastes horizontal space on desktop and feels dense on mobile. The same details (distance, duration, speed, odometer, locations) could render as inline pills that flow and wrap to fill available width on any viewport, giving the trip list a more modern, compact look without changing what information is revealed.

## What Changes

- **Trip detail body → inline pills**: replace the stacked `<dl>` grid in `TripRow.tsx` with a flex-wrap container of pill elements. Each pill renders as `icon + value + unit` (e.g. `📍 15.0 km`). The `<dl>` semantic structure is preserved — each pill is a `<dd>` with its `<dt>` visually hidden (sr-only) as the semantic label. Conditional details (avg speed, odometer) simply omit their pill when null.
- **Route pill**: combine the separate "From" and "To" details into a single route pill: `🚩 Home <icon-circle-arrow-right> 🏁 Work`. Semantically one `<dt>` ("Route", sr-only) + one `<dd>`. If only one location exists, render a half-route pill (start-only or end-only).
- **CSS**: add `.trip-detail-pills` and `.trip-detail-pill` classes to `public/app.css`, grounded in Pico CSS variables (muted border, form-element background, muted icon color). No inline styles, no new framework.
- **No behavior change**: the `<details>`/`<summary>` expand-collapse pattern stays as-is. Pills are revealed on demand, same as the current stacked details. No new dependencies, no schema, no API changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — layout is an implementation detail, not spec-level behavior. The existing "Trip detail expansion" requirement in `home-page-ssr` already covers what matters: "system reveals additional trip details (distance, average speed, odometer reading, locations)." How those details are visually laid out is not spec-worthy.)

## Impact

- **Code**: `src/frontend/components/TripRow.tsx` (HTML structure of the expanded body), `public/app.css` (pill styles, remove/replace `.trip-snapshot` grid rules).
- **Dependencies**: none new.
- **APIs**: none. The trip data payload is unchanged.
- **Database**: none.
- **Specs**: none — `skip_specs: true` set in `.openspec.yaml`.

## Rollback

Pure-frontend change. Revert `TripRow.tsx` and the `app.css` pill rules to their pre-change state (`git revert`). No data migration, no API contract change, no cache to clear.
