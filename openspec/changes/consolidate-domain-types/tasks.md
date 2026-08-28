## 1. Database migration

- [ ] 1.1 Create dbmate migration renaming the five `trips` columns (`duration_min`→`duration`, `distance_km`→`distance`, `avg_speed_kmh`→`speed`, `avg_consumption_kwh_100km`→`consumption`, `odometer_km`→`odometer`) with `COMMENT ON COLUMN` documenting each unit
- [ ] 1.2 Write the down script renaming columns back to unit-suffixed names
- [ ] 1.3 Verify `bunx dbmate up` then `bunx dbmate down` round-trips cleanly on the dev database

## 2. Shared domain types

- [ ] 2.1 Export `Daypart = "morning" | "afternoon"` from `src/backend/types.ts` and use it in the zod schema instead of the local `daypart` enum literal
- [ ] 2.2 Promote `WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">` from `fetcher.ts` to `src/backend/weather/types.ts` and export it
- [ ] 2.3 Rename the zod request fields in `tripInputSchema` to unit-free names (`duration`, `distance`, `speed`, `consumption`, `odometer`); keep validation rules unchanged

## 3. Query layer

- [ ] 3.1 Update `TripRow` and `TripWithLocationRow` in `db/queries/trips.ts` to the new column names; type `weather_start`/`weather_end` as `WeatherSnapshot | null` and `weatherStart` as `WeatherSnapshot | null`
- [ ] 3.2 Update `mapTripRow` / `mapTripWithLocationRow` and all SQL column references in `trips.ts` (`createTrip`, `findTripsWithLocations`, `findLatestOdometerForVehicle`, etc.)
- [ ] 3.3 Update `PeriodSeriesRow` and SQL references in `db/queries/stats.ts` to the new column names
- [ ] 3.4 Confirm `db/convert.ts` (`toUtcDateTime` / `fromUtcDateTime` / `toNumber`) is unchanged — `Date` absorption stays here

## 4. Handlers — remove Date conversion

- [ ] 4.1 In `home.tsx`, remove the `tripsResult.map(...)` block that builds the camelCase/`Date` shape; pass `TripWithLocationRow[]` directly to `HomePage`
- [ ] 4.2 In `html-handlers.tsx` `getPartialTrips`, remove the same conversion; pass rows directly to `TripListFragment`
- [ ] 4.3 Update `html-handlers.tsx` `parseFormTripInput` to emit unit-free field names matching the new `tripInputSchema`
- [ ] 4.4 Update `api/trips.ts` request/response mapping to the new field names; the response (`TripCreationRaw`) already uses unit-free camelCase — verify only the mapping from row fields changes

## 5. Frontend — consume row types directly

- [ ] 5.1 Delete the local `Trip` interface in `TripRow.tsx`, `TripListFragment.tsx`, and `HomePage.tsx`; `import type { TripWithLocationRow }` from the backend query layer instead
- [ ] 5.2 Update `TripRow.tsx` to use `trip.start_time` / `trip.end_time` (snake_case) as `DateTime` via `setZone(tz).toFormat(...)` instead of `new Date(...).toLocaleString(..., {timeZone})`
- [ ] 5.3 Replace the `weatherStart as WeatherData` cast with the typed `WeatherSnapshot`; delete the local `WeatherData` interface
- [ ] 5.4 Delete the local `StatWithDelta`/`StatsView` interfaces in `StatsPage.tsx` and `StatsChartsFragment.tsx`; `import type` the owners (`stats.tsx`)
- [ ] 5.5 Replace the redeclared `StatsSummary` in `StatsSummaryGrid.tsx` with a derivation from `StatsView["stats"]` (plus `period`); remove its `StatWithDelta` redeclaration
- [ ] 5.6 Update `HomePage.tsx` `HomePageData["stats"]` to reuse `StatsSummary & { period: "month" }` instead of the inlined shape

## 6. Stats view ownership

- [ ] 6.1 Export `StatsView`, `StatsSummary`, and `StatWithDelta` from `src/backend/stats.tsx` as the single owners
- [ ] 6.2 Ensure `home.tsx` `HomeData` and `html-handlers.tsx` `getPartialStats` build these shared shapes rather than inline duplicates

## 7. Tests

- [ ] 7.1 Update `db/queries/trips.test.ts` and `db/queries/stats.test.ts` fixtures and assertions to the new column names
- [ ] 7.2 Update `frontend/__tests__/trip-row.test.tsx` to construct `TripWithLocationRow` shapes with `DateTime` and typed `WeatherSnapshot`
- [ ] 7.3 Update `frontend/__tests__/stats-charts.test.tsx` and `navigation.test.tsx` to import the shared `StatsView`/`TripWithLocationRow` types
- [ ] 7.4 Update `backend/validation.test.ts`, `home.test.ts`, and `weather/recorder.test.ts` request/fixture field names to unit-free names

## 8. Verification

- [ ] 8.1 Run `bun run check` (tsc --noEmit) and resolve all type errors
- [ ] 8.2 Run `bun test` and ensure all tests pass
- [ ] 8.3 Run `docker build .` to verify the container builds
- [ ] 8.4 Manually verify the home page and stats page render identically (no HTML output regression)