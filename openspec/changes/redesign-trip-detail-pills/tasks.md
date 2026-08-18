## 1. CSS foundation

- [ ] 1.1 Add `.sr-only` utility class to `public/app.css` (standard screen-reader-only pattern: `position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; white-space: nowrap; border: 0`)
- [ ] 1.2 Add `.trip-detail-pills` class to `public/app.css`: `display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 0 0;` (replaces the `.trip-snapshot` grid on the `<dl>`)
- [ ] 1.3 Add `.trip-detail-pill` class to `public/app.css` per Decision 4: inline-flex, centered, gap 0.35rem, padding 0.25rem 0.65rem, border 1px `--pico-muted-border-color`, border-radius 9999px, background `--pico-form-element-background-color`, font-size 0.875rem. Icon muted via `--pico-muted-color`, unit small and muted.
- [ ] 1.4 Remove the old `.trip-snapshot` grid rules (`grid-template-columns: auto 1fr`, `.trip-snapshot dt`, `.trip-snapshot dd`) from `public/app.css` — they are replaced by the pill classes

## 2. TripRow rewrite

- [ ] 2.1 In `src/frontend/components/TripRow.tsx`, change the `<dl>` from `class="trip-snapshot"` to `class="trip-detail-pills"`
- [ ] 2.2 For each detail (Distance, Duration, Avg speed, Odometer): add `class="sr-only"` to the `<dt>`, add `class="trip-detail-pill"` to the `<dd>`. Keep the icon inside the `<dd>`. Keep conditional rendering (`{trip.avgSpeedKmh !== null && ...}`) unchanged.
- [ ] 2.3 Replace the separate From (`icon-flag`) and To (`icon-flag-triangle-right`) `<dt>`/`<dd>` pairs with a single route pill: one `<dt class="sr-only">Route</dt>` + one `<dd class="trip-detail-pill">` containing `icon-flag` + startLocation + `icon-circle-arrow-right` + `icon-flag-triangle-right` + endLocation. Render only when at least one location exists. Render start-only or end-only when only one is present (no arrow in that case).

## 3. Verification

- [ ] 3.1 Run `bun test` — confirm no existing test regressed (tests check for presence of detail content like distance values and location labels, not for the `dl` grid layout)
- [ ] 3.2 Start the dev server, visit `/`, expand a trip with all details (distance, duration, speed, odometer, both locations). Confirm: pills render inline, wrap on narrow viewports, route pill shows `Home → Work` with `circle-arrow-right` icon between the locations
- [ ] 3.3 Expand a trip with only one location (start-only or end-only). Confirm: route pill renders without the arrow icon
- [ ] 3.4 Expand a trip with null avg speed and null odometer. Confirm: those pills are absent, remaining pills reflow with no gap
- [ ] 3.5 Resize to phone width (<768px). Confirm: pills wrap to 1-2 per row, route pill spans full width if locations are long
