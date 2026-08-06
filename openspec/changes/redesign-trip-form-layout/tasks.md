## 1. CSS foundation in `public/app.css`

- [ ] 1.1 Add `.trip-form .grid { grid-template-columns: 1fr 1fr; }` override to force two columns on all viewports (scoped to trip form only)
- [ ] 1.2 Add `.trip-form .grid--full { grid-template-columns: 1fr; }` modifier for full-width rows (vehicle)
- [ ] 1.3 Add `.trip-form label small { font-size: 0.7rem; font-weight: 400; color: var(--pico-muted-color); }` for muted unit suffixes
- [ ] 1.4 Override `--pico-form-element-spacing-vertical: 0.4rem` and `--pico-form-element-spacing-horizontal: 0.6rem` (scope to `.trip-form` or `:root` per design decision 5)
- [ ] 1.5 Add `.sticky-submit` styles: `position: sticky; bottom: 0; background: var(--pico-background-color); padding: 0.75rem 0; border-top: 1px solid var(--pico-muted-border-color); z-index: 10`
- [ ] 1.6 Add `.sticky-submit .grid { grid-template-columns: 1fr 1fr; margin: 0; gap: 0.5rem; }` for the Back + Save two-column bar
- [ ] 1.7 Style `.sticky-submit a[role=button]` as secondary (use `--pico-secondary-*` variables) and `.sticky-submit button` as full-width primary
- [ ] 1.8 Add `.trip-form { padding-bottom: 90px; }` so the sticky bar never overlaps the last field

## 2. Restructure `src/frontend/pages/TripFormPage.tsx`

- [ ] 2.1 Wrap the `<form>` with `class="trip-form"` (or add the class to the existing form element) so the scoped CSS overrides apply
- [ ] 2.2 Row 1: combine the date input and the daypart `<fieldset class="daypart-selector">` into a single `<div class="grid">` (date in col 1, daypart in col 2)
- [ ] 2.3 Row 2: keep start time and end time in one `<div class="grid">` — remove the duration `<output>` label and element entirely
- [ ] 2.4 Row 3: combine distance and odometer inputs into one `<div class="grid">`; wrap units as `<small>` — `Distance <small>(km)</small>`, `Odometer <small>(km)</small>`
- [ ] 2.5 Row 4: combine average speed and consumption inputs into one `<div class="grid">`; wrap units as `<small>` — `Avg speed <small>(km/h)</small>`, `Consumption <small>(kWh/100km)</small>`
- [ ] 2.6 Row 5: keep start location and end location selects in one `<div class="grid">` (already paired)
- [ ] 2.7 Row 6: move vehicle `<select>` into a `<div class="grid grid--full">` so it spans full width alone
- [ ] 2.8 Remove the in-flow `<button type="submit" class="contrast">Save trip</button>`
- [ ] 2.9 Remove the `<input type="hidden" name="duration_min" value="" />` element
- [ ] 2.10 Remove the `<StickyCta href="/" label="Back to home" />` usage from this page (do NOT delete the `StickyCta` component itself — other pages may use it)
- [ ] 2.11 Add the sticky submit bar at the end of the form: `<div class="sticky-submit"><div class="grid"><a href="/" role="button">Back</a><button type="submit" class="contrast">Save trip</button></div></div>`

## 3. Verify backend handler compatibility

- [ ] 3.1 Read `src/backend/html-handlers.tsx` `getTripFormPage` and the trip submission handler — confirm `duration_min` is injected server-side and no reference to the removed hidden field exists
- [ ] 3.2 If any handler reads `duration_min` from the form body, remove that read (server derives it; the field no longer exists in the form)

## 4. Update tests

- [ ] 4.1 Search `src/backend/trips.test.ts` and any form rendering tests for assertions on the duration `<output>`, the hidden `duration_min` input, or the `StickyCta` usage on the trip form
- [ ] 4.2 Update or remove assertions that checked for the old duration field markup
- [ ] 4.3 Update assertions that checked for the old in-flow Save button or the separate back CTA to reflect the new sticky bar structure
- [ ] 4.4 Run `bun test` and ensure all tests pass

## 5. Visual verification

- [ ] 5.1 Start the dev server (`bun run dev`) and open the trip form in a browser
- [ ] 5.2 Use Playwright (`playwright-cli open --device="iPhone 15"`) to load the trip form and verify: all seven important fields (date, daypart, start, end, distance, odometer, speed, consumption) are visible in the first four rows above the fold
- [ ] 5.3 Verify the sticky Back + Save bar is visible at the bottom of the viewport at top scroll position
- [ ] 5.4 Scroll to the bottom of the form and verify the sticky bar does not overlap the vehicle dropdown
- [ ] 5.5 Verify the daypart segmented control pills ("☀ Morning", "☾ Afternoon") render complete and not truncated beside the date input
- [ ] 5.6 Verify "Consumption (kWh/100km)" label fits on one line in its 2-column cell without wrapping

## 6. Lint, format, and build

- [ ] 6.1 Run `bun run format:check` (or `bun run format`) and fix any formatting issues
- [ ] 6.2 Run `docker build .` and verify the container builds successfully
