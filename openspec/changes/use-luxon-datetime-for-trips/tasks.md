## 1. DB schema — drop locations.timezone

- [x] 1.1 Edit `db/migrations/20260711220117_init.sql`: remove `timezone TEXT NOT NULL` from `locations` table definition
- [x] 1.2 Edit `db/migrations/20260818152358_seed--data.sql`: remove `timezone` column and value from the `INSERT INTO locations` statement
- [x] 1.3 Run `bunx dbmate down && bunx dbmate up` locally to verify clean reapply
- [x] 1.4 Update `src/backend/weather/recorder.test.ts:15` — remove `timezone` from the test's `INSERT INTO locations`

## 2. Schema transform and type split

- [x] 2.1 In `src/backend/types.ts`: add `.transform(s => DateTime.fromISO(s, { setZone: true }).toUTC())` to `start_time` and `end_time` in `tripInputSchema`
- [x] 2.2 In `src/backend/types.ts`: change `TripInput` to `z.output<typeof tripInputSchema>` (DateTime fields)
- [x] 2.3 In `src/backend/types.ts`: add `export type TripInputRaw = z.input<typeof tripInputSchema>` (string fields)
- [x] 2.4 In `src/backend/types.ts`: delete the dead `Trip` interface (lines 30-35)
- [x] 2.5 Delete `src/check.ts` (spike file absorbed into the schema transform)

## 3. DB convert helpers — write mirror

- [x] 3.1 In `src/db/convert.ts`: add `fromUtcDateTime(dt: DateTime): string` that asserts `dt.zoneName === "utc"` and returns `dt.toISO()` (throw if zone is not UTC)
- [x] 3.2 Verify `toUtcDateTime` (read side) is unchanged and still correct

## 4. Collapse validators into one middleware

- [x] 4.1 In `src/backend/validators.ts`: create a single async middleware `validateTripInput` that reads `c.req.valid("json") as TripInput`, then runs `validateVehicle`, `validateStartLocation`, `validateEndLocation`, `validateTripConflict`, `validateOdometer` sequentially (throwing on first failure)
- [x] 4.2 Delete the five `validator("json")` exports: `vehicleValidator`, `startLocationValidator`, `endLocationValidator`, `tripConflictValidator` (and the implicit odometer check wiring)
- [x] 4.3 In `src/backend/index.ts`: replace the five middleware registrations with the single `validateTripInput` middleware between `creationValidator` and `creationHandler`
- [x] 4.4 Verify `validateTripConflict` reads `req.end_time` as a `DateTime` (it does — `TripInput` now has `DateTime` fields); update `existsTripByVehicleAndEndTime` param type to `DateTime` and serialize via `.toISO()` at query site

## 5. Update trips queries — DateTime writes and params

- [x] 5.1 In `src/db/queries/trips.ts` `createTrip`: change `INSERT` values for `start_time`/`end_time` to `fromUtcDateTime(input.start_time)` / `fromUtcDateTime(input.end_time)`
- [x] 5.2 In `createTrip` weather params: replace `DateTime.fromISO(input.start_time, {zone: "UTC"})` with `input.start_time` directly (same for `end_time`)
- [x] 5.3 In `existsTripByVehicleAndEndTime`: change `endTime: string` param to `endTime: DateTime`; use `fromUtcDateTime(params.endTime)` in the SQL
- [x] 5.4 In `findTripsByMonth` / `findTripsByMonthForVehicle` / `findTripsWithLocations`: change `startUtc`/`endUtc` params from `string` to `DateTime`; use `.toISO()` at the SQL comparison site
- [x] 5.5 In `TripWithLocationRow`: remove `start_tz` and `end_tz` fields
- [x] 5.6 In `mapTripWithLocationRow`: remove `start_tz`/`end_tz` mapping
- [x] 5.7 In `findTripsWithLocations` (both branches of the SQL): remove `start_loc.timezone as start_tz` and `end_loc.timezone as end_tz` from the SELECT

## 6. Bounds functions — return DateTime

- [x] 6.1 In `src/utils/dates.ts`: change `resolveDisplayTz` to `displayTz()` — return `process.env.DISPLAY_TZ || "Europe/Copenhagen"`; delete the location-fallback chain
- [x] 6.2 In `src/utils/dates.ts`: change return type of `currentMonthBoundsUtc`, `prevMonthBoundsUtc`, `currentWeekBoundsUtc`, `prevWeekBoundsUtc`, `currentYearBoundsUtc`, `prevYearBoundsUtc`, `periodBoundsUtc` from `{ startUtc: string; endUtc: string }` to `{ startUtc: DateTime; endUtc: DateTime }` (zone UTC); return `DateTime` instances instead of `.toISO()` strings
- [x] 6.3 Update `src/utils/dates.test.ts` to assert `DateTime` returns (`.toISO()` for comparison)

## 7. Update all callers of resolveDisplayTz and bounds functions

- [x] 7.1 `src/backend/handlers.ts`: replace `resolveDisplayTz(undefined, undefined, ...)` with `displayTz()`; serialize bounds via `.toISO()` when passing to `findTripsByMonth`
- [x] 7.2 `src/backend/home.tsx`: same replacement; serialize bounds for query calls
- [x] 7.3 `src/backend/html-handlers.tsx`: same replacement in `getTripFormPage`, `getPartialTrips`, `getPartialStats`; serialize bounds for `findTripsWithLocations`
- [x] 7.4 `src/backend/stats.tsx`: same replacement (2 sites); serialize bounds for `statsQueries.periodAggregates`
- [x] 7.5 `src/db/queries/stats.ts`: update `periodAggregates` param types from `startUtc: string`/`endUtc: string` to `DateTime`; serialize via `.toISO()` at SQL site

## 8. Form path — emit local-offset ISO

- [x] 8.1 In `src/backend/html-handlers.tsx` `parseFormTripInput`: change return type to `TripInputRaw`; change `.toUTC().toISO()` to `.toISO()` (preserve DISPLAY_TZ offset, no `Z`)
- [x] 8.2 Verify `htmlCreationHandler` still calls `tripInputSchema.parse(input)` — the transform now handles offset→UTC normalization

## 9. Update handlers — output shaping

- [x] 9.1 `src/backend/handlers.ts` `creationHandler`: remove `as TripInput` cast (type is now correct from `c.req.valid`); verify `trip.start_time.toISO()` still works (TripRow has `DateTime`)
- [x] 9.2 `src/backend/handlers.ts` `getTrips`: same cast cleanup; bounds are now `DateTime`, serialize for query
- [x] 9.3 `src/backend/html-handlers.tsx` `getPartialTrips`: `trip.start_time.toISO()` still works; remove the `new Date(trip.start_time.toISO() as string)` wrapper if redundant (verify `TripListFragment` expects a `Date` or ISO string)

## 10. Tests and verification

- [x] 10.1 Run `bun test` — fix all failures from type changes and DateTime assertions
- [x] 10.2 Run `docker build .` — verify container builds
- [x] 10.3 Manual smoke test: POST `/api/trips` with `+02:00` offset body, verify 201 and correct UTC storage; submit form, verify trip created with correct UTC time
- [x] 10.4 Verify `openspec validate --change use-luxon-datetime-for-trips` passes
