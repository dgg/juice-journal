## Why

The trip form on phone screens is too long: all important bits (date, times, daypart, distance, speed, consumption, odometer) cannot be seen at once, and the save action sits at the bottom with no sticky anchor — requiring scroll regardless. Phone is the primary device, so the horizontal space and viewport height must be used better.

## What Changes

- **Phone-first 2-column grid**: collapse Pico's default 1-column mobile stack into a forced 2-column grid for the trip form, so paired fields (date|daypart, start|end, distance|odometer, speed|consumption, start-loc|end-loc) share rows. Vehicle row stays full-width.
- **Daypart moved beside date**: the segmented control moves from its own full-width row into the date row's second column, pairing the two "when" fields and eliminating a row.
- **Duration field removed from the form**: no visible output, no hidden input. The server already derives `duration_min` from `end_time - start_time`; the form stops sending it entirely.
- **Sticky submit bar with Back + Save**: a sticky bottom bar holds a secondary Back link (left) and a primary Save trip button (right), replacing the in-flow save button and the separate Back CTA. Form gets `padding-bottom` so the sticky bar never overlaps the last field.
- **Smaller units in labels**: unit suffixes (`km`, `km/h`, `kWh/100km`) render as `<small>` muted text at `0.7rem`, keeping labels on one line and preserving 2-column alignment.
- **Tighter control padding**: override `--pico-form-element-spacing-vertical` / `--pico-form-element-spacing-horizontal` on the trip form to shrink input height and give the 2-column layout breathing room on phone.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-input-form`: field layout changes from single-column stack to phone-first 2-column grid; daypart relocates beside date; duration field is removed from the form markup (server-side derivation was already specified, the form-side hidden input and read-only output are dropped); save and back actions consolidate into a single sticky bottom bar; unit labels render smaller to preserve alignment.

## Impact

- **Frontend**: `src/frontend/pages/TripFormPage.tsx` — restructured grid, removed duration `<output>` and hidden `duration_min` input, replaced in-flow save button + `StickyCta` back link with a single sticky bar holding both actions.
- **CSS**: `public/app.css` — new rules for `.trip-form` 2-column grid override, `.sticky-submit` bar, `.trip-form label small` unit styling, and Pico spacing variable overrides. All Pico-grounded (option 2/3 on the styling ladder).
- **Backend**: `src/backend/html-handlers.tsx` — no handler logic change expected; duration server-side derivation already exists. (Verify no reference to the removed hidden `duration_min` field.)
- **Tests**: `src/backend/trips.test.ts` and any form rendering tests — update assertions that checked for the duration field or the old sticky CTA.
- **No dependency changes**. No new client-side JS frameworks. No schema changes.

## Rollback

Revert the frontend and CSS changes; the server-side duration derivation continues to work because it never depended on the form-side field. The hidden `duration_min` input can be restored to the form if any downstream code expected it (none does today — the handler injects the derived value before `.parse()`).
