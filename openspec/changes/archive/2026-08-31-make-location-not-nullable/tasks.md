## 1. DB Migration

- [x] 1.1 Edit `db/migrations/20260711220117_init.sql`: add `NOT NULL` to `start_location location_enum` and `end_location location_enum` on the `CREATE TABLE trips` statement

## 2. Core Type & Schema Changes

- [x] 2.1 In `src/backend/types.ts`, change `start_location: location.optional()` to `start_location: location` and same for `end_location: location.optional()` to `end_location: location`
- [x] 2.2 In `src/backend/db/queries/trips.ts`, update `TripRow` interface: `start_location: Location` (remove `| null`) and `end_location: Location`
- [x] 2.3 In `src/backend/db/queries/trips.ts`, update `TripWithLocationRow` interface: `start_location: string` (remove `| null`) and `end_location: string`
- [x] 2.4 In `src/backend/db/queries/trips.ts`, simplify `mapTripRow`: remove `?? null` fallback for start_location/end_location (direct cast)
- [x] 2.5 In `src/backend/db/queries/trips.ts`, simplify `mapTripWithLocationRow`: remove `?? null` fallback for location fields
- [x] 2.6 In `src/backend/db/queries/trips.ts`, simplify `createTrip`: remove `?? null` on location inserts; remove ternary guard on weather fetch (always call `locationCoords`)

## 3. Frontend & Form Updates

- [x] 3.1 In `src/backend/presentation/trips.tsx`, update `parseFormTripInput`: remove `|| undefined` fallback for `start_location` and `end_location` — cast directly from body (Zod will reject if missing)
- [x] 3.2 In `src/frontend/components/TripRow.tsx`, simplify the route pill: remove the outer `{trip.start_location || trip.end_location ? ...}` conditional and the inner null guards — locations are always present

## 4. Test Updates

- [x] 4.1 Update `src/backend/db/queries/trips.test.ts`: add `start_location` and `end_location` to all `createTrip` calls (every trip insert must include locations); update "findTripsByMonth" and "findLatestTripVehicleId" test data
- [x] 4.2 Update `src/backend/home.test.ts`: add `start_location` and `end_location` to every test INSERT that creates a trip
- [x] 4.3 Update `src/backend/validation.test.ts`: add test cases that reject missing `start_location` and missing `end_location`; update "Optional Fields" test to include locations as required fields; update "Multiple Field Errors" expected count
- [x] 4.4 Run all tests: `bun test`

## 5. Spec Update (main specs, not delta)

- [x] 5.1 Edit `openspec/specs/trips-api/spec.md`: update "Trips table" requirement to show `NOT NULL` location columns; update "POST /api/trips" required fields list; update "Trip with minimal data" scenario
- [x] 5.2 Edit `openspec/specs/trip-input-form/spec.md`: update "Location presets from daypart at render" to require locations; remove "If the user submits without selecting a location, the corresponding field SHALL be null" language