## Context

The current `TripFormPage` (`src/frontend/pages/TripFormPage.tsx`) is a skeleton with broken free-text inputs for 16-char nanoid IDs, hardcoded hidden fields (`daypart=morning`, `duration_min=0`, `distance_km=0`), and no defaults. The HTML creation handler (`src/backend/html-handlers.tsx`) parses the form via `parseFormTripInput`, calls `tripInputSchema.parse()`, runs existing validators (`validateVehicle`, `validateStartLocation`, `validateEndLocation`, `validateTripConflict`), then inserts via `tripsQueries.createTrip`. The schema and JSON API (`POST /api/trips`) are unchanged by this design.

Existing queries to reuse: `findLatestTripVehicleId()` (already used by the home page for default-vehicle logic). New queries needed: `listAllVehicles()`, `listAllLocations()`, `findLocationByLabel(label)`, `findLatestOdometerForVehicle(vehicleId)`.

## Goals / Non-Goals

**Goals:**

- A mobile-first form that can be filled in under 30 seconds at the end of a commute
- Server-side derivation of duration and daypart so the form sends minimal raw data
- Vehicle and location selection via dropdowns, never free-text IDs
- Odometer data integrity via monotonicity validation

**Non-Goals:**

- Changing the `tripInputSchema` or the JSON API (`POST /api/trips`) — those remain as-is
- Creating new vehicles or locations from the form — dropdown selection only
- Overnight trip support — same-day assumption via shared date field
- Live re-derivation of daypart/locations on start-time edit (Flavor 1 only — render-time coupling)
- Weather data entry — out of scope

## Decisions

### D1: Duration derived in `parseFormTripInput`, not in the schema

**Decision:** `parseFormTripInput` assembles `start_time` and `end_time` from the shared date + separate time inputs, computes `duration_min = end − start` in minutes, and injects all three into the object before calling `tripInputSchema.parse()`. The schema is unchanged.

**Rationale:** Keeping the schema unchanged means the JSON API (`POST /api/trips`) is unaffected — no breaking change. The form simply never sends `duration_min`; the handler derives it. The schema still validates it as a positive integer, catching negative durations (end before start).

**Alternative considered:** Making `duration_min` optional in the schema and deriving it in `createTrip`. Rejected — would change the shared schema and affect the JSON API contract.

### D2: Date + time assembly via Luxon

**Decision:** The handler uses Luxon to combine the date string, time string, and `DISPLAY_TZ` (default `Europe/Copenhagen`) into a `DateTime`, then calls `.toISO()` to produce the ISO 8601 UTC string the schema expects.

**Rationale:** Luxon is already a dependency and already used in `html-handlers.tsx` for month bounds. Consistent with existing date-handling patterns.

### D3: Daypart segmented control as styled radios

**Decision:** Daypart is rendered as two `<input type="radio">` elements (same `name="daypart"`, values `morning`/`afternoon`) inside a `<fieldset>` with a domain-semantic class (`daypart-selector`). CSS in `public/app.css` hides the native radio dots, styles the labels as pills, and highlights the checked option using `--pico-primary-background` / `--pico-primary-inverse`. No inline styles, no client-side JS.

**Rationale:** Radios are the semantically correct element for "pick one of N." Pico has no native segmented control, but `:checked + span` selector with Pico variables achieves the look within the AGENTS.md styling rules (Pico variables, app.css last resort, domain-semantic class name).

**Alternative considered:** A `<select>` dropdown. Rejected — two options is faster as pills than opening a dropdown. A Pico switch. Rejected — switch is on/off semantics, not A/B choice.

### D4: Location preset at render time only (Flavor 1)

**Decision:** `getTripFormPage` loads all vehicles, all locations, the "home" and "work" locations by label, and the last-used vehicle. It passes these as props to `TripFormPage`, which pre-selects locations based on the daypart derived from the now-snapshot. No HTMX round-trip on start-time blur; no client-side re-swap logic.

**Rationale:** 99% of commutes match the now-snapshot's half-day. The rare override (early return, late start) is one tap on the daypart pill. Avoids lock-state tracking and client-side JS entirely — consistent with the "no client-side JS frameworks" rule.

**Alternative considered:** Flavor 2 (daypart live on start-time blur, locations follow). Rejected — adds client-side JS or HTMX round-trips, adds a "user touched daypart" flag, and the benefit is marginal for the rare override case.

### D5: Odometer validation as a new async validator

**Decision:** A new `validateOdometer` function in `src/backend/validators.ts`, added to the HTML handler's validation chain (after `validateTripConflict`). It queries `findLatestOdometerForVehicle(vehicleId)`; if a prior reading exists and the submitted value is lower, it throws a `FOREIGN_KEY_VIOLATION`-style problem (reusing the problem registry pattern) with `422` status and a `detail` identifying `odometer_km`.

**Rationale:** Follows the existing validator pattern (`validateVehicle`, `validateTripConflict`). Server-side only, consistent with the user's preference. Reuses the problem-details error path.

**Alternative considered:** Client-side check via HTMX. Rejected — the "last odometer" is a server truth; duplicating it client-side adds complexity for no gain.

### D6: Vehicle and location dropdowns from new list queries

**Decision:** Add `listAllVehicles()` to `vehiclesQueries` (returns `VehicleRow[]` — `id` + `description`) and `listAllLocations()` + `findLocationByLabel(label)` to `locationsQueries`. `getTripFormPage` calls these and passes the lists as props.

**Rationale:** Minimal additions following existing query patterns. `findLocationByLabel` is needed for the preset logic (look up "home" / "work" by label text).

## Risks / Trade-offs

- **[Stale presets if start time is edited]** → User edits start time across the 13:00 threshold; daypart stays at the render-time default. Mitigation: one tap override on the segmented control. Acceptable for v1.
- **[Location label dependency]** → Preset logic depends on locations labeled exactly "home" and "work" existing in the DB. If they don't exist, dropdowns default to empty (graceful degradation). User confirmed they will seed locations properly in a later story.
- **[Duration negative if end < start]** → If the user enters end time before start time, `duration_min` would be negative. The schema (`z.number().int().positive()`) catches this and returns `422`. No extra validation needed.
- **[Odometer race]** → Two trips submitted concurrently for the same vehicle could pass the monotonicity check and both insert. Acceptable for a single-user personal app.
