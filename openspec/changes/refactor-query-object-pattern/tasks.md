## 1. Data-access foundation

- [ ] 1.1 Create `src/db/convert.ts` exporting `toNumber(value: string | null | undefined): number | null` (moved from `home.ts` `asNumber`) to parse `NUMERIC`/`DECIMAL` columns returned as strings, and `toUtcDateTime(value: Date): DateTime` (Luxon, `{ zone: "utc" }`) for `TIMESTAMPTZ` projection in query objects. Keep DB-concern conversions in `src/db/` separate from UI formatting in `src/utils/`.
- [ ] 1.2 Rewrite `src/db/client.ts` to use Bun's built-in SQL client: `import { SQL } from "bun"`, construct `new SQL(process.env.DATABASE_URL!)` behind the existing missing-`DATABASE_URL` fail-fast guard, export the shared `sql` instance, and update `testConnection()` to run `SELECT 1` via the new client. Remove the `console.log(DATABASE_URL)` debug line.
- [ ] 1.3 Create `src/db/queries/` directory.

## 2. Query objects

- [ ] 2.1 Create `src/db/queries/vehicles.ts`: export `VehicleRow` type and `vehiclesQueries` with `findVehicleById(id: string): Promise<VehicleRow | null>` (selects `id, description`) and `vehicleExists(id: string): Promise<boolean>`.
- [ ] 2.2 Create `src/db/queries/locations.ts`: export `locationsQueries` with `locationExists(id: string): Promise<boolean>`.
- [ ] 2.3 Create `src/db/queries/trips.ts`: export `TripRow` type (mirrors the `trips` table shape, nullable fields as `| null`, `TIMESTAMPTZ` columns as Luxon `DateTime` in UTC) and `tripsQueries` with:
  - `createTrip(input: TripInput): Promise<TripRow>` (`INSERT … RETURNING *`, projecting the row to `TripRow`, parsing `TIMESTAMPTZ` via `toUtcDateTime`).
  - `findTripsByMonth(params: { startUtc: string; endUtc: string }): Promise<TripRow[]>` (current-month `SELECT *` ordered by `end_time DESC`).
  - `findTripsByMonthForVehicle(params: { startUtc: string; endUtc: string; vehicleId: string }): Promise<TripRow[]>` (same with `vehicle_id` filter — used by `home.ts`).
  - `existsTripByVehicleAndEndTime(params: { vehicleId: string; endTime: string }): Promise<boolean>`.
  - `findLatestTripVehicleId(): Promise<string | null>` (`SELECT vehicle_id … ORDER BY end_time DESC LIMIT 1`).
  - `findTripsWithLocations(params: { startUtc: string; endUtc: string; vehicleId?: string }): Promise<TripWithLocationRow[]>` (the joined query from `home.ts`, projecting `NUMERIC` via `toNumber`, `TIMESTAMPTZ` via `toUtcDateTime`, returning `DateTime` fields directly).
- [ ] 2.4 Create `src/db/queries/stats.ts`: export `MonthlyAggregates` type (`{ avgConsumption: number | null; avgDuration: number | null; totalDistance: number | null }`) and `statsQueries.monthlyAggregates(params: { startUtc: string; endUtc: string; vehicleId?: string }): Promise<MonthlyAggregates>` running the `AVG/SUM` query and parsing `NUMERIC` aggregates with `toNumber`.

## 3. Migrate callers

- [ ] 3.1 Migrate `src/backend/handlers.ts`: replace inline `db` SQL with `tripsQueries.createTrip(input)` (in `creationHandler`) and `tripsQueries.findTripsByMonth({ startUtc, endUtc })` (in `getTrips`). Build the JSON response from the typed `TripRow` returned by the query object — serialize `DateTime` fields via `toISO()`; remove the per-field mapping blocks.
- [ ] 3.2 Migrate `src/backend/home.ts`: replace inline SQL with `tripsQueries.findLatestTripVehicleId()`, `vehiclesQueries.findVehicleById(id)`, `statsQueries.monthlyAggregates(...)` (current + previous month, with/without `vehicleId`), and `tripsQueries.findTripsWithLocations(...)`. Remove the local `asNumber` helper (now via `toNumber`/query objects). Build `trips` array from `TripWithLocationRow` — the row already provides UTC `DateTime`, so drop the `DateTime.fromISO(trip.start_time.toISOString())` round-trip and keep `.setZone(displayTz)` only where formatting for display.
- [ ] 3.3 Migrate `src/backend/validators.ts`: replace inline `db` probes with `vehiclesQueries.vehicleExists(id)`, `locationsQueries.locationExists(id)`, and `tripsQueries.existsTripByVehicleAndEndTime(...)`. Keep the `ProblemDetailsError` throwing and error shape unchanged.
- [ ] 3.4 Remove all `import { db } from "../db/client"` from `handlers.ts`, `home.ts`, `validators.ts`; replace with imports from `src/db/queries/*`.

## 4. Remove the `postgres` dependency

- [ ] 4.1 Confirm no remaining `import … from "postgres"` or `import { db }` references in `src/`.
- [ ] 4.2 Run `bun remove postgres` to drop the dependency from `package.json`.

## 5. Tests & verification

- [ ] 5.1 Run `bun test` and confirm all existing suites (`handlers.test.ts`, `home.test.ts`, `validators.test.ts`) pass unchanged.
- [ ] 5.2 Add `src/db/queries/trips.test.ts` and `src/db/queries/stats.test.ts` covering row projection/parsing: `NUMERIC` string → `number`, nullable columns → `null`, `TIMESTAMPTZ` → Luxon `DateTime` (UTC, asserting `.toMillis()` and `.zone.zoneName`), and the existence methods' boolean results.
- [ ] 5.3 Run `bun run format:check` (prettier) and fix formatting.
- [ ] 5.4 Run `docker build .` to verify the containerized build still succeeds without `postgres`.
