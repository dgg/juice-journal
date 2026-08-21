## Context

See `proposal.md` for the motivation. Today `tripsQueries.createTrip` writes `weather_start = null` and `weather_end = null` unconditionally; the JSONB columns already exist in the `trips` table (migration `20260711220117_init.sql`). The `locations` table already has `latitude DECIMAL(9,6)` and `longitude DECIMAL(9,6)`, but `LocationRow` (`src/db/queries/locations.ts`) only exposes `{id, label, timezone}`. Two creation paths funnel through `createTrip`: `creationHandler` (REST) and `htmlCreationHandler` (HTMX); a future trip-processor path is expected to call the REST endpoint, so weather logic placed inside `createTrip` is inherited by all entry points.

## Goals / Non-Goals

**Goals:**
- Populate `weather_start` / `weather_end` for new trips at creation time, server-side, with no UI surfacing the weather during creation.
- Pick the right Open-Meteo endpoint per trip age (forecast vs archive).
- Keep the trip record durable even when Open-Meteo is unavailable.
- Preserve provenance (`source`, `observed_at`, `fetched_at`) and units (QUDT strings) so future correlations are trustworthy.

**Non-Goals:**
- Background backfill job for orphaned (`NULL`-weather) trips. Out of scope; manual backfill via a future trip-processor feature covers the historical case.
- Re-fetching weather for existing trips. Once stored, the JSONB value is immutable unless manually re-backfilled.
- Storing the Open-Meteo `model` in the JSONB shape. Accepted as an implementation detail; `fetched_at` timestamps the write.
- Validating the JSONB shape at the DB layer. Single-writer app; the contract is enforced at the fetcher seam in TypeScript.
- Client-side rendering of weather. The UI does not surface weather during trip creation.

## Decisions

### 1. Weather logic lives in `tripsQueries.createTrip`

Both creation handlers (`creationHandler`, `htmlCreationHandler`) already call `tripsQueries.createTrip`. Placing the fetch + persist logic inside `createTrip` means the REST path, the HTMX path, and any future trip-processor that calls the REST endpoint inherit the behavior with zero wiring changes. The alternative (handler-level orchestration) would require duplicating the fetch call at every entry point.

### 2. Drop `current=`, use `hourly` only

Open-Meteo's `current=` returns a snapshot at request time, not at `start_time`/`end_time`. Using `hourly` with enough `past_hours` / `past_days` to cover `start_time..end_time` and selecting the nearest bucket gives both sides a uniform data kind (bucketed, not instantaneous) and a clean `observed_at` timestamp. One code path covers every case; the "end ≈ now" case is not special-cased.

### 3. Endpoint selection: 7-day cutoff, close the 1-7d gap with `/forecast`

`age <= 7d` → `/forecast` with `past_days = ceil(age_days)` (covers up to ~92 days back, well within the 1-7d band). `age > 7d` → `/archive` (default model; ERA5/CERRA reanalysis lags ~5-7d so the 7-day buffer avoids empty archive responses). Alternative considered: try archive, fall back to forecast on empty. Rejected — two calls per save is more failure surface than one call with an age-based branch.

### 4. DMI model for forecast, default for archive

`models=dmi_harmonie_arome_europe` (2.5km regional, Europe-only) is pinned for `/forecast` because the journal's `DISPLAY_TZ` defaults to `Europe/Copenhagen`. For `/archive`, the model is omitted — the archive endpoint may not expose the DMI model for older dates, and the default ERA5 reanalysis is the archive's native product. Pinning DMI on archive would risk empty responses for some date ranges.

### 5. Single request per endpoint, parallel arrays for both locations

Open-Meteo accepts comma-separated `latitude` / `longitude` and returns parallel arrays. When `start_location != end_location`, both are passed in one request; when equal, one location is passed. Alternative considered: one request per location. Rejected — doubles latency and rate-limit pressure for no benefit. The response arrays are correlated by index; `start_location_id` and `end_location_id` determine which indices to read.

### 6. Hybrid sync/async retry (5s, 30s), no backfill job

Sync fetch in the save path → success stores weather in the same INSERT. Failure → trip is saved with `NULL` weather, response returns 201, two async retries fire at +5s and +30s. After 3 total failures, weather stays `NULL`. No background backfill job in scope. Alternative considered: fire-and-forget on save with no sync attempt. Rejected — the sync attempt covers ~95% of cases in the same request, and the retry path only handles the rare outage. Alternative considered: full C3 (save-only + scheduled sweep). Rejected — out of scope per decision; manual backfill via the future trip-processor feature covers historical gaps.

### 7. Units embedded as QUDT strings, not in field names

Each measurement is `{v, u}` where `u` is the QUDT unit string (`DEG_C`, `M-PER-SEC`, `MILLI-M`, `PERCENT`, `DEG`). Units travel with the value, so a future fetcher change (e.g., switching to `km/h`) cannot silently corrupt meaning. `weather_code` is a plain integer (WMO category, not a measurement). Alternative considered: units in field names (`temperature_c`). Rejected — the `{v, u}` envelope is self-describing and matches the QUDT convention the user specified.

### 8. `LocationRow` extended to expose lat/long

`locationsQueries` gains a `findLocationById(id)` that returns `{id, label, latitude, longitude, timezone}`. `createTrip` looks up both location rows once, extracts lat/long, and passes them to the fetcher. `LocationRow` is widened to include `latitude` / `longitude` (already in the DB schema). No migration needed.

### 9. Request `timezone=UTC`, match buckets in UTC

Open-Meteo is requested with `timezone=UTC` (or the `tz` param omitted on archive, which defaults to UTC). The trip's `start_time` / `end_time` are already UTC in the DB. Bucket selection compares UTC timestamps directly — no tz-juggling. The location's `timezone` column is only used for display, not for the weather request.

## Risks / Trade-offs

- **Async retry lost on process crash**: if the process dies between the sync failure and the +5s/+30s retries, the orphaned trip stays `NULL` forever. Mitigation: the future trip-processor's manual backfill path covers this; for a solo journal with infrequent restarts, the window is small and the user notices gaps.
- **Archive accuracy for very recent dates**: archive returns preliminary reanalysis for dates within ~5-7 days, which may be refined later. Mitigation: the 7-day cutoff sends recent trips to `/forecast` (which is more accurate for recent dates anyway); only trips older than 7d hit archive, by which point reanalysis has stabilized.
- **DMI model availability outside Europe**: if the journal moves outside Europe, `dmi_harmonie_arome_europe` returns empty. Mitigation: acceptable for now (`DISPLAY_TZ=Europe/Copenhagen`); a future change can swap the model or fall back to `best_match`.
- **No JSONB shape validation at the DB**: a manual seed or backfill could write malformed JSON. Mitigation: single-writer app; the fetcher produces the shape and the TS interface is the contract. If a second writer is ever introduced, add a CHECK constraint or a typed `weather` composite type.
- **One Open-Meteo request per save, two locations in parallel arrays**: if either location's lat/long is malformed, the whole request fails and both sides stay `NULL`. Mitigation: lat/long are validated at location-seed time (DECIMAL(9,6) with range constraints already in schema).

## Migration Plan

No DB migration. The `weather_start` / `weather_end` columns already exist as nullable JSONB; today they are always `NULL`. This change populates them. Existing rows remain `NULL` — the future trip-processor's manual backfill feature covers historical trips.

**Rollback**: revert `createTrip` to write `NULL` for both weather columns; remove the `src/backend/weather/` module and the `LocationRow` latitude/longitude additions. Existing stored weather JSON remains valid (additive — readers tolerate `NULL`).

## Open Questions

None material. The `past_hours` sizing for `/forecast` (`ceil((now - start_time) hours) + 1`) is an implementation detail, not a design decision — the spec requires coverage of `start_time..end_time` and the bucket-picker handles selection.
