## 1. New DB queries

- [x] 1.1 Add `listAllVehicles()` to `vehiclesQueries` in `src/db/queries/vehicles.ts` — returns `VehicleRow[]` (`id`, `description`)
- [x] 1.2 Add `listAllLocations()` to `locationsQueries` in `src/db/queries/locations.ts` — returns all locations (`id`, `label`)
- [x] 1.3 Add `findLocationByLabel(label: string)` to `locationsQueries` — returns a single location by exact label match, or null
- [x] 1.4 Add `findLatestOdometerForVehicle(vehicleId: string)` to `tripsQueries` in `src/db/queries/trips.ts` — returns the `odometer_km` from the most recent trip for the vehicle, or null if no trips

## 2. Odometer validator

- [x] 2.1 Add `validateOdometer(req: TripInput)` to `src/backend/validators.ts` — queries `findLatestOdometerForVehicle`, throws a `422` problem if submitted `odometer_km` is lower than the last reading; skips check if no prior trip or if `odometer_km` is undefined
- [x] 2.2 Add `validateOdometer` to the validation chain in `htmlCreationHandler` (after `validateTripConflict`)

## 3. Form page data loading

- [x] 3.1 Modify `getTripFormPage` in `src/backend/html-handlers.tsx` to load: all vehicles, all locations, "home"/"work" locations by label, last-used vehicle ID (via existing `findLatestTripVehicleId`), and now-snapshot (DK local via Luxon + `DISPLAY_TZ`)
- [x] 3.2 Derive default daypart from now-snapshot (hour < 13 → morning, else afternoon)
- [x] 3.3 Compute location presets from default daypart (morning → home→work, afternoon → work→home)
- [x] 3.4 Pass all loaded data as props to `TripFormPage`

## 4. TripFormPage rewrite

- [x] 4.1 Rewrite `src/frontend/pages/TripFormPage.tsx` with the mobile-first field ordering: date, start time, end time, duration (read-only), distance, avg speed, consumption, odometer, daypart, start location, end location, vehicle
- [x] 4.2 Add separate `<input type="date">` (shared, default today) and `<input type="time">` for start and end times (end default now-snapshot)
- [x] 4.3 Render duration as a read-only `<output>` or `<data>` element (no form field sent)
- [x] 4.4 Add `avg_speed_kmh` as a `<input type="number">` field (was missing from current form)
- [x] 4.5 Render daypart as a `<fieldset>` with two `<input type="radio">` (morning/afternoon), default checked from derived daypart
- [x] 4.6 Render start and end locations as `<select>` dropdowns populated from the locations list, pre-selected from presets
- [x] 4.7 Render vehicle as a `<select>` dropdown populated from vehicles list, default selected from last-used vehicle
- [x] 4.8 Ensure form `action="/trips"` and `hx-post="/trips"` with `hx-target="#trip-list"` and `hx-swap="beforeend"` are preserved

## 5. Form parsing and server-side derivation

- [x] 5.1 Modify `parseFormTripInput` in `src/backend/html-handlers.tsx` to accept separate `trip_date`, `start_time`, `end_time` fields and assemble ISO datetimes via Luxon (`DISPLAY_TZ` zone → UTC ISO string)
- [x] 5.2 Compute `duration_min` from the assembled `end_time − start_time` (in whole minutes) and inject it into the parsed object before `tripInputSchema.parse()`
- [x] 5.3 Remove `duration_min` from the form-parsed body (it is no longer a form field)
- [x] 5.4 Keep `daypart` from the form body (user override is respected)

## 6. CSS for daypart segmented control

- [x] 6.1 Add `.daypart-selector` rules to `public/app.css` — hide radio dots, style labels as pills, highlight checked option via `:checked + span` using `--pico-primary-background` / `--pico-primary-inverse`
- [x] 6.2 Verify no inline styles are used in the component (per AGENTS.md styling rules)

## 7. Tests

- [ ] 7.1 Test `listAllVehicles()`, `listAllLocations()`, `findLocationByLabel()`, `findLatestOdometerForVehicle()` return expected data
- [ ] 7.2 Test `validateOdometer` accepts higher odometer, rejects lower odometer with `422`, skips check when no prior trip, skips when odometer omitted
- [ ] 7.3 Test `parseFormTripInput` correctly assembles ISO datetimes from date + time inputs and derives `duration_min`
- [ ] 7.4 Test `getTripFormPage` passes correct props (vehicle list, location list, presets, default daypart) to the view
- [ ] 7.5 Test daypart derivation: start time before 13:00 → morning, at/after 13:00 → afternoon
- [ ] 7.6 Test location presets: morning → home→work, afternoon → work→home, graceful empty when label missing
- [ ] 7.7 Test end-to-end form submission via `htmlCreationHandler` with the new field set produces a valid trip

## 8. Verification

- [x] 8.1 Run `bun test` — 67/74 pass, 3 pre-existing failures (test DB has real data — empty-state and assertion tests find real trips), 4 skipped
- [x] 8.2 Run `docker build .` — Docker build succeeds
- [x] 8.3 Manually test the form on a mobile viewport: fill from car screen data, verify duration auto-calc, verify daypart preset, verify location preset, submit successfully — user confirmed sunny path works
