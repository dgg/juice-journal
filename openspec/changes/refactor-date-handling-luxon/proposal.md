## Why

Date and timezone handling is scattered and fragile. `GET /api/trips` computes the current-month window in `src/backend/handlers.ts` using native `Date` plus `Intl.DateTimeFormat` part-picking, with an inline "simplified approach" comment and no support for the location-timezone fallback the spec already mandates. Native `Date` timezone math is error-prone around DST and month edges. Luxon is already named in the project stack (AGENTS.md) but not installed; consolidating date logic into a Luxon-based utility removes the fragility and closes the spec gap in one move.

## What Changes

- Add `luxon` as an approved runtime dependency (install via `bun install luxon`).
- Introduce a shared date utility module (`src/utils/dates.ts`) backed by Luxon that resolves the display timezone and computes inclusive-start / exclusive-end month bounds in UTC.
- Replace the manual `Date`/`Intl.DateTimeFormat` month-boundary logic in `getTrips` (`src/backend/handlers.ts`) with calls to the new utility.
- Implement the full display-timezone fallback chain (end_location → start_location → `DISPLAY_TZ` default `Europe/Copenhagen`) that the `trips-api` spec already requires but the current "simplified" code omits.
- No API, schema, or trip data-structure changes; behavior preserved except the previously-missing location-timezone resolution now matches spec.

## Capabilities

### New Capabilities
- `date-handling`: Luxon-based utilities for display-timezone resolution and inclusive-start / exclusive-end calendar-month boundary computation in UTC, consumed by trip-listing handlers.

### Modified Capabilities
- `trips-api`: The `GET /api/trips endpoint (current month)` and `Display timezone resolution` requirements are unchanged in contract; their month-boundary implementation now delegates to the `date-handling` capability, closing the gap between spec and the prior simplified code.

## Impact

- **Dependencies:** Adds `luxon` (already sanctioned in the stack; needs human approval to install per dependency rules).
- **Code:** `src/utils/dates.ts` (new), `src/backend/handlers.ts` (`getTrips` rewritten), `src/backend/handlers.ts` test file may need new cases for timezone fallback.
- **APIs/Schema:** None — endpoints, request/response shapes, and DB schema unchanged.
- **Risk:** Low; pure logic consolidation. Month-boundary outputs feed the same existing `WHERE end_time >= ... AND end_time < ...` query.

### Rollback Plan

1. Revert `src/backend/handlers.ts` to the prior native-`Date` implementation.
2. Delete `src/utils/dates.ts`.
3. Run `bun remove luxon` to restore the dependency manifest.
4. Re-run `bun test` to confirm baseline behavior. No migration or data changes to undo.
