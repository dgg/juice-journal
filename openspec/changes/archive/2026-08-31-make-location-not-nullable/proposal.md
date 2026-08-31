## Why

`start_location` and `end_location` are currently nullable across the DB schema, Zod validation, and code types, but every trip should have known start and end locations. Making them required simplifies the data model, eliminates null‑handling branches, and ensures location data is always present for weather lookups and route display.

## What Changes

- **DB migration**: add `NOT NULL` to `start_location` and `end_location` in the `trips` table; update migration docs
- **Zod schema** (`src/backend/types.ts`): `start_location` and `end_location` become required (remove `.optional()`)
- **Type interfaces** (`TripRow`, `TripWithLocationRow`): remove `| null` from location fields
- **Query layer** (`trips.ts`): remove `?? null` fallbacks for location inserts and type mappers
- **Frontend form parser** (`trips.tsx`): `parseFormTripInput` requires a location value instead of `|| undefined`
- **Frontend TripRow component**: remove conditional rendering branches for null locations
- **Frontend form spec**: replace "may be null" language with "always required"
- **Tests**: update test data (all trips get `start_location` and `end_location`); add validation tests for missing locations; remove "minimal data" scenario that omitted locations

## Capabilities

### Modified Capabilities

- **trips-api** (`openspec/specs/trips-api/spec.md`): DB column definition changes from nullable to `NOT NULL`; `POST /api/trips` endpoint makes `start_location` and `end_location` required; "minimal data" scenario updated
- **trip-input-form** (`openspec/specs/trip-input-form/spec.md`): location presets behavior — locations are always required, not nullable

## Impact

- One new DB migration (add `NOT NULL` to existing columns — assumes no NULL rows in production; if any exist, they must be backfilled first)
- `src/backend/types.ts` – Zod schema change (breaking for callers that omit locations)
- `src/backend/db/queries/trips.ts` – type interfaces and query code
- `src/backend/db/queries/trips.test.ts` – test data update
- `src/backend/presentation/trips.tsx` – form parser
- `src/frontend/components/TripRow.tsx` – remove null‑guarded rendering
- `src/backend/validation.test.ts` – new test cases
- `src/backend/home.test.ts` – all test inserts need locations
- Rollback: revert the migration (`bunx dbmate down`), revert Zod/types, revert frontend