## 1. Location query layer

- [x] 1.1 Widen `LocationRow` in `src/db/queries/locations.ts` to expose `latitude: number` and `longitude: number` (already in DB schema)
- [x] 1.2 Add `findLocationById(id: string): Promise<LocationRow | null>` to `locationsQueries`
- [x] 1.3 Add a bun test covering `findLocationById` (existing seeded location, missing id)

## 2. Weather shape and bucket-picker

- [x] 2.1 Create `src/backend/weather/types.ts` with a `WeatherSnapshot` TS interface matching the spec's storage shape (`source`, `observed_at`, `fetched_at`, `weather_code`, `temperature`, `humidity`, `precipitation`, `wind{speed, direction}` with `{v, u}` envelopes and QUDT unit strings)
- [x] 2.2 Create `src/backend/weather/bucket-picker.ts` exporting a `nearestBucket(hourlyTimes: string[], target: string)` helper that returns the index of the bucket whose timestamp is closest to `target`
- [x] 2.3 Add a bun test for `nearestBucket` covering: exact match, midpoint tie-break direction, empty array

## 3. Open-Meteo fetcher

- [x] 3.1 Create `src/backend/weather/fetch.ts` exporting `fetchWeather(params: { startLat, startLong, endLat, endLong, startTime, endTime }): Promise<{ start?: WeatherSnapshot, end?: WeatherSnapshot }>`
- [x] 3.2 Implement age-based endpoint selection: `age <= 7d` → `/forecast` with `models=dmi_harmonie_arome_europe` and `past_hours`/`past_days` sized to cover `now - startTime`; `age > 7d` → `/archive` (no `models`, `start_date`/`end_date` from the trip date in UTC)
- [x] 3.3 Request `hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code` and `wind_speed_unit=ms`, `timezone=UTC` (or omit on archive where UTC is default)
- [x] 3.4 Handle the single-location case (start == end location): pass one lat/long, read one set of arrays
- [x] 3.5 Handle the two-location case: pass comma-separated `latitude`/`longitude`, read the parallel arrays and correlate by index
- [x] 3.6 Map the Open-Meteo response into `WeatherSnapshot` using `nearestBucket` for each side; set `source` to `forecast` or `historic`; set `observed_at` to the bucket timestamp; set `fetched_at` to `now`
- [x] 3.7 Skip a side silently (return `undefined` for that side) when its lat/long is null/undefined; never throw on missing location
- [x] 3.8 Throw on fetch errors (non-2xx, network error, timeout) with a typed error so the retry layer can distinguish them
- [x] 3.9 Add a bun test mocking `fetch`: forecast path success, archive path success, two-location parallel arrays, single-location, HTTP 5xx throws

## 4. Hybrid retry layer

- [x] 4.1 Create `src/backend/weather/recorder.ts` exporting `recordWeather(tripId, locations, times)` that: attempts a sync `fetchWeather`; on success returns the snapshots; on failure schedules `setTimeout(..., 5_000)` for retry 1 and `setTimeout(..., 30_000)` for retry 2, each re-calling `fetchWeather` and updating the trip row on success; logs each failure at `warn` via the existing `pino` logger
- [x] 4.2 On async retry success, run a `UPDATE trips SET weather_start = ..., weather_end = ... WHERE id = ... ` via a new `tripsQueries.updateWeather(id, weatherStart, weatherEnd)` query
- [x] 4.3 After 3 total failures (sync + 2 async), stop and leave `NULL`; do not schedule further work
- [x] 4.4 Add a bun test for `recordWeather`: sync success (no setTimeout scheduled), sync failure + first retry success (one setTimeout, one UPDATE), all-three-failure (two setTimeouts, no UPDATE, warn logged)

## 5. Wire into `createTrip`

- [x] 5.1 In `tripsQueries.createTrip` (`src/db/queries/trips.ts`), after the INSERT, look up `start_location_id` and `end_location_id` via `locationsQueries.findLocationById`; skip the weather call if both are null
- [x] 5.2 Call `recordWeather` with the new trip's id, the resolved locations, and `start_time`/`end_time`; await the sync attempt, but let the async retries run detached (do not await them)
- [x] 5.3 Ensure the INSERT proceeds with `weather_start = NULL` / `weather_end = NULL` when the sync fetch fails; the async retries UPDATE the row later
- [x] 5.4 Verify both creation paths (`creationHandler`, `htmlCreationHandler`) still return 201 with the trip record even when the sync fetch fails (no new error paths surface to the client)
- [x] 5.5 Add an integration-style bun test that mocks `fetchWeather`: trip save + sync-success populates the JSONB; trip save + sync-failure still returns the trip with `NULL` weather and schedules retries

## 6. Verification and cleanup

- [x] 6.1 Run `bun test` — all new and existing tests pass
- [x] 6.2 Run `bun run typecheck` (or `tsc --noEmit`) if present; fix any type errors in the weather module
- [x] 6.3 Verify `docker build .` succeeds (per AGENTS.md pre-commit)
- [x] 6.4 Grep for any TODO/FIXME introduced; remove or file follow-ups