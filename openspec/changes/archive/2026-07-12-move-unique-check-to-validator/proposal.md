## Why

The `creationHandler` currently catches the INSERT error and string-matches `duplicate key` / `UNIQUE` to produce a `TRIP_CONFLICT` response. This couples the handler to DB error text, duplicates the validator middleware pattern already used for foreign-key checks, and leaves the handler doing more than its single responsibility (INSERT). The existing `vehicleValidator` / `startLocationValidator` / `endLocationValidator` middleware already prove that async pre-checks belong in a dedicated validation step; the unique check should follow the same pattern.

## What Changes

- Add a `tripConflictValidator` (`validator("json", ...)`) in `src/backend/validators.ts` that queries `trips` for an existing row with the same `(vehicle_id, end_time)` before the INSERT and throws `TRIP_CONFLICT` (`409`) if found.
- Wire `tripConflictValidator` into the `POST /api/trips` route chain in `src/backend/index.ts`, before `creationHandler`.
- Remove the `try/catch` unique-constraint detection from `creationHandler` so it performs only the INSERT and response shaping.
- Let a genuine race (a duplicate inserted between the pre-check and the INSERT) surface as an unhandled error → `500` per the `error-handling` capability, rather than being caught and rewritten. This is the accepted tradeoff for not inspecting DB error text.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `request-validation`: add a dedicated unique-existence pre-check validation step (mirroring the existing async FK-check pattern), and update the "Handler contains no FK logic" scenario so the handler performs only the INSERT with no conflict handling.
- `trips-api`: reframe the `POST /api/trips` conflict clause from "UNIQUE constraint conflict → 409" to "a trip with the same `vehicle_id` and `end_time` already exists → 409", reflecting that detection now happens in the validation step rather than by catching the DB constraint error.

## Impact

- **Code:** `src/backend/validators.ts` (new validator), `src/backend/handlers.ts` (simplified `creationHandler`), `src/backend/index.ts` (route chain).
- **APIs:** No public API contract change for the documented duplicate case (`409 TRIP_CONFLICT` preserved); a true race condition now yields `500` instead of `409`.
- **Dependencies:** None added.
- **Rollback plan:** Revert `creationHandler` to the `try/catch` unique-constraint detection and remove `tripConflictValidator` from the route chain and `validators.ts`. No schema or data migration is involved, so rollback is a pure code revert.
