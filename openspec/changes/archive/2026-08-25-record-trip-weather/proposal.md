## Why

Commute consumption (kWh/100km) is sensitive to ambient temperature, wind, and precipitation. Trips already store `weather_start` / `weather_end` JSONB columns (always `NULL` today); capturing actual conditions at each trip's start and end locations lets us correlate weather against consumption and answer "what were the conditions on my highest-consumption trips?" (issue #20).

## What Changes

- Introduce server-side weather fetching from Open-Meteo on trip creation (both REST and HTMX paths, funneled through `tripsQueries.createTrip`).
- Fetch `hourly` data only (no `current=`), selecting the nearest bucket to `start_time` and `end_time` for each location.
- Route to `/forecast` (pinned `dmi_harmonie_arome_europe` model) when trip age <= 7 days; route to `/archive` (default model) when > 7 days. Close the 1-7d gap by using `/forecast` with `past_days` sized to the trip age.
- Persist weather into the existing `weather_start` / `weather_end` JSONB columns using a provenance-rich shape: `{source, observed_at, fetched_at, weather_code, temperature, humidity, precipitation, wind{speed, direction}}` with units embedded per value (QUDT unit strings: `DEG_C`, `M-PER-SEC`, `MILLI-M`, `PERCENT`, `DEG`).
- Hybrid retry: try a synchronous fetch during save; on failure, save the trip with `NULL` weather and schedule up to 2 async retries (5s, 30s). After 3 failures, leave `NULL`. Failures are logged at `warn`.
- Skip weather silently (leave `NULL`) when `start_location_id` or `end_location_id` is `NULL`.
- Extend `LocationRow` to expose `latitude` / `longitude` (already in schema) for use during fetch.

## Capabilities

### New Capabilities

- `trip-weather`: Server-side weather recording on trip creation — endpoint selection (forecast vs archive), hourly bucket selection, provenance-rich JSONB storage shape, hybrid sync/async retry strategy, null-location handling.

## Impact

- **Code**: `src/db/queries/trips.ts` (`createTrip`), `src/db/queries/locations.ts` (`LocationRow` + new `findLocationById`), new `src/backend/weather/` module (fetcher + bucket-picker + storage shape), both creation handlers unchanged (funnel through `createTrip`).
- **APIs**: outbound Open-Meteo `/forecast` and `/archive` calls; no inbound API contract change.
- **Dependencies**: none new (use built-in `fetch`).
- **External failure surface**: trip save no longer fails when Open-Meteo is down — weather is best-effort enrichment, never blocks the primary record.

### Rollback plan

- Revert `createTrip` to write `weather_start` / `weather_end` as `NULL` (current behavior); remove the weather fetch call. Existing stored weather JSON remains valid (additive — readers tolerate `NULL`).
- Remove the `src/backend/weather/` module and the `LocationRow` latitude/longitude additions.
- No DB migration needed: columns already exist; no schema change.
