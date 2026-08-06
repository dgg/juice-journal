## Why

Trip input happens on mobile, at the end of a commute, from a car screen. The current `TripFormPage` is unusable on a phone: it requires typing 16-char nanoid IDs for vehicle and locations, has no default for end_time, hardcodes daypart as "morning," sends duration=0 and distance=0 as hidden dead fields, and omits avg_speed entirely. Entry is slow and error-prone. Issue #2.

## What Changes

- **Streamlined mobile-first form** replacing `TripFormPage`: phone-first layout with car-data fields on top (date, start time, end time, distance, avg speed, consumption, odometer), derived fields below (daypart, locations), vehicle dropdown at bottom.
- **End time defaults to now** (DK local, snapshot at render). Start time entered from car. Duration derived read-only as `end − start`.
- **Separate date and time inputs** sharing one date field (same-day assumption — no overnight trips).
- **Daypart auto-derived from start_time** (threshold 13:00 local). Editable via a segmented radio control (☀ Morning / ☾ Afternoon). Locations preset from daypart: morning → home→work; afternoon → work→home. Preset happens at render only; user can override either field freely.
- **Vehicle dropdown** (default = last trip's vehicle or the only vehicle). **Location dropdowns** (select from known locations, not free-text nanoid IDs).
- **Odometer validation**: new reading must be ≥ last recorded odometer for the selected vehicle. Server-side, returns problem details on violation.
- `duration_min` leaves the form entirely; the HTML handler derives it from `end − start` before schema validation. The JSON API (`POST /api/trips`) is unchanged.
- Drop the broken 16-char text inputs for vehicle_id and location IDs.

## Capabilities

### New Capabilities

- `trip-input-form`: Mobile-first trip entry form — field set, defaults (end_time=now, daypart, location presets), server-side duration derivation, vehicle/location dropdowns, odometer ≥ last-reading validation.

### Modified Capabilities

_(none — the JSON API at `POST /api/trips` and the `tripInputSchema` are unchanged; duration derivation happens in the HTML handler before `tripInputSchema.parse`.)_

## Impact

- **Code**: `src/frontend/pages/TripFormPage.tsx` (rewrite), `src/backend/html-handlers.tsx` (`parseFormTripInput`, `getTripFormPage`), `src/backend/validators.ts` (new odometer validator), `src/db/queries/vehicles.ts` (`listAllVehicles`), `src/db/queries/locations.ts` (`listAll`, `findByLabel`), `src/db/queries/trips.ts` (`findLatestOdometerForVehicle`), `public/app.css` (segmented control styling).
- **API**: no breaking changes. `POST /api/trips` JSON API unchanged.
- **DB**: no migration. Schema unchanged.
- **Rollback**: revert `TripFormPage.tsx` and `parseFormTripInput` to current state, remove new queries/validators/CSS. No data migration needed.
