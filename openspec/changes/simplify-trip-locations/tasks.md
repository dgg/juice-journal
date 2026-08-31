## 1. Migrations

- [x] 1.1 Drop the development database (`bunx dbmate down` or `docker compose down -v`) so the consolidated migration applies fresh
- [x] 1.2 Rewrite `db/migrations/20260711220117_init.sql` — migrate:up: create `pgcrypto` extension, `nanoid` + `nanoid_optimized` functions, `daypart_enum`, `location_enum AS ENUM('home','work')`, `vehicles` table (nanoid `TEXT` PK `DEFAULT nanoid(16)`), `trips` table (nanoid PK, `vehicle_id` FK, `start_location`/`end_location` nullable `location_enum`, unit-free column names `duration`/`distance`/`speed`/`consumption`/`odometer` with SQL `COMMENT ON COLUMN` documenting each unit, `weather_start`/`weather_end` JSONB, `tracking_created`/`tracking_updated`, `UNIQUE(vehicle_id, end_time)`); migrate:down: drop in FK order (`trips`, `vehicles`, types, functions, extension)
- [x] 1.3 Delete `db/migrations/20260712000001_use_nanoid_keys.sql` (folded into init)
- [x] 1.4 Delete `db/migrations/20260828140000_rename_trip_columns.sql` (folded into init)
- [x] 1.5 Rewrite `db/migrations/20260818152358_seed--data.sql` — migrate:up: `INSERT INTO vehicles (description) VALUES ('commuter');` (remove the locations INSERT); migrate:down: `DELETE FROM vehicles WHERE description = 'commuter';` (remove the locations DELETE)
- [x] 1.6 Run `bunx dbmate up` and verify fresh schema: `vehicles` + `trips` tables exist, `location_enum` + `daypart_enum` types exist, no `locations` table, `start_location`/`end_location` enum columns present, no `start_location_id`/`end_location_id` columns

## 2. Environment config

- [x] 2.1 Add `HOME_LATLNG=55.676098,12.568337` and `WORK_LATLNG=55.6500,12.5410` to `.env` (replace with real commute coordinates; gitignored already)
- [x] 2.2 Add `HOME_LATLNG` and `WORK_LATLNG` documentation comments to `.env` describing the comma-separated `latitude,longitude` format and fail-fast behavior when unset

## 3. Backend types & Zod schema

- [x] 3.1 In `src/backend/types.ts`: add `const LOCATIONS = ["home", "work"] as const` and `const location = z.enum(LOCATIONS)`; export `type Location = z.infer<typeof location>`
- [x] 3.2 In `tripInputSchema`: replace `start_location_id: nanoid.optional()` with `start_location: location.optional()`; same for `end_location_id` → `end_location`
- [x] 3.3 In `waypoint` (used by `tripCreationSchema`): replace `location: nanoid.nullable()` with `location: location.nullable()`
- [x] 3.4 Verify `TripInput` and `TripInputRaw` derived types now carry `start_location: "home"|"work"|undefined` and `end_location: "home"|"work"|undefined`

## 4. Coords helper module

- [x] 4.1 Create `src/backend/utils/coords.ts` exporting `locationCoords(label: "home" | "work"): { latitude: number; longitude: number }` that reads `HOME_LATLNG` (for "home") or `WORK_LATLNG` (for "work") from `process.env`, splits on comma, parses to floats, and throws a descriptive `Error` if the env var is unset or malformed (not parseable as two numbers)
- [x] 4.2 Add a unit test `src/backend/utils/coords.test.ts` covering: valid coordinate string parsed correctly; missing env var throws; malformed string throws

## 5. Trip queries

- [x] 5.1 In `src/backend/db/queries/trips.ts` `TripRow` interface: replace `start_location_id: string | null` and `end_location_id: string | null` with `start_location: "home" | "work" | null` and `end_location: "home" | "work" | null`
- [x] 5.2 In `mapTripRow`: replace `start_location_id`/`end_location_id` mapping with `start_location`/`end_location` (cast raw value to `"home"|"work"|null`)
- [x] 5.3 In `createTrip`: replace the `INSERT` column list `start_location_id, end_location_id` with `start_location, end_location`; replace the VALUES `${input.start_location_id ?? null}, ${input.end_location_id ?? null}` with `${input.start_location ?? null}, ${input.end_location ?? null}`; remove the `locationsQueries.findLocationById` lookups; instead resolve coordinates via `locationCoords()` from `src/backend/utils/coords` only when `input.start_location` or `input.end_location` is non-null; build `WeatherParam` from the resolved coords and call `storeWeather` as before
- [x] 5.4 In `TripWithLocationRow` interface: `start_location: string | null` and `end_location: string | null` stay (already label strings); no change needed — verify
- [x] 5.5 In `findTripsWithLocations`: remove the `LEFT JOIN locations` clauses; select `t.start_location` and `t.end_location` directly from `trips` (no join needed); update both the vehicleId and non-vehicleId query branches
- [x] 5.6 Remove the `import { locationsQueries } from "./locations"` from `trips.ts`; add `import { locationCoords } from "../../utils/coords"`

## 6. Validators

- [x] 6.1 In `src/backend/api/validators.ts`: delete `validateStartLocation` and `validateEndLocation` functions entirely
- [x] 6.2 In `validateTripInput`: remove the `await validateStartLocation(input)` and `await validateEndLocation(input)` calls
- [x] 6.3 Remove the `import { locationsQueries } from "../db/queries/locations"` from `validators.ts`
- [x] 6.4 Verify `validateVehicle`, `validateTripConflict`, `validateOdometer` remain unchanged

## 7. API handler

- [x] 7.1 In `src/backend/api/trips.ts`: in the response shaping, replace `start: { location: trip.start_location_id, ... }` with `start: { location: trip.start_location, ... }` and `end: { location: trip.end_location_id, ... }` with `end: { location: trip.end_location, ... }`

## 8. Presentation handler (HTMX form)

- [x] 8.1 In `src/backend/presentation/trips.tsx` `FormBody` interface: replace `start_location_id?: string` with `start_location?: string` and `end_location_id?: string` with `end_location?: string`
- [x] 8.2 In `parseFormTripInput`: replace `start_location_id: body.start_location_id || undefined` with `start_location: (body.start_location as "home" | "work") || undefined`; same for `end_location_id` → `end_location`
- [x] 8.3 In `getTripFormPage`: remove `locationsQueries.findLocationByLabel("home")`, `findLocationByLabel("work")`, and `locationsQueries.listAllLocations()` calls; compute `startLocation`/`endLocation` as `"home"|"work"|null` directly from `defaultDaypart` (morning: start "home", end "work"; afternoon: swapped); remove the `locations` prop passed to `TripFormPage`; pass `startLocation`/`endLocation` (string labels) instead of `startLocationId`/`endLocationId`
- [x] 8.4 In `htmlCreationHandler`: remove `await validateStartLocation(parsed)` and `await validateEndLocation(parsed)` calls; remove the imports of `validateStartLocation`/`validateEndLocation`
- [x] 8.5 Remove `import { locationsQueries } from "../db/queries/locations"` from `presentation/trips.tsx`

## 9. Form component

- [x] 9.1 In `src/frontend/pages/TripFormPage.tsx`: replace `LocationOption` interface with no DB-sourced type; change `TripFormPageProps` to take `startLocation: "home"|"work"|null` and `endLocation: "home"|"work"|null` instead of `startLocationId`/`endLocationId`/`locations`
- [x] 9.2 In the location dropdowns: replace `name="start_location_id"` with `name="start_location"`; render fixed `<option value="home">home</option>` and `<option value="work">work</option>` (plus the empty `—` option); set `selected` based on `startLocation === "home"` etc. — no `.map()` over a locations array
- [x] 9.3 Same for the end location dropdown: `name="end_location"`, fixed options, `selected` from `endLocation`

## 10. Delete locations module

- [x] 10.1 Delete `src/backend/db/queries/locations.ts` and its test file if one exists
- [x] 10.2 Search for any remaining imports of `locationsQueries` or `./locations` across `src/` and remove them (grep for stragglers)

## 11. Tests

- [x] 11.1 Update `src/backend/db/queries/trips.test.ts` (if it references `start_location_id`/`end_location_id` or the locations join) to use `start_location`/`end_location` enum values
- [x] 11.2 Update `src/backend/home.test.ts` (if it exercises the form or trip creation with location ids) to use enum location values
- [x] 11.3 Run `bun test` and verify all tests pass; fix any failures caused by the field rename or removed location module

## 12. Verify

- [x] 12.1 `bunx dbmate up` on a fresh DB — schema applies cleanly, no `locations` table
- [x] 12.2 `bun test` — green
- [x] 12.3 `bun run src/backend/index.ts` (or the repo's start command) — server boots without error
- [x] 12.4 Manual smoke: open the trip form, verify home/work dropdowns render and submit creates a trip with weather fetched using `HOME_LATLNG`/`WORK_LATLNG`
- [x] 12.5 `docker build .` — image builds (per AGENTS.md pre-commit checklist)