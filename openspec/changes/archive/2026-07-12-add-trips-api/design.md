## Context

Greenfield project. `index.ts` is a placeholder (`console.log`). No database schema, no API, no migrations. Docker-compose provides Postgres 17. The goal is to establish the data layer and a minimal REST API for logging EV commute trips — no UI yet.

Tech stack: Bun, Hono, PostgreSQL, dbmate (dev dep, already installed). No frontend in this slice.

## Goals / Non-Goals

**Goals:**

- Define and migrate the database schema (`cars`, `locations`, `trips`).
- Provide `POST /api/trips` to create a trip record with validation.
- Provide `GET /api/trips` to retrieve trips for the current calendar month.
- Establish dbmate migration workflow (local auto-run, prod manual).
- Establish the Postgres client singleton and Hono server entrypoint.

**Non-Goals:**

- UI / HTMX / Pico CSS — deferred to a later slice.
- OCR upload feature.
- Analytics/charts endpoints.
- Authentication / multi-user support.
- Weather API integration (weather JSONB stored as-is when provided).
- Auto-rollback in production (migrations run manually there).

## Decisions

### D1: Trip primary key — synthetic UUID vs composite (car_id, end_time)

**Decision**: Synthetic UUID (`gen_random_uuid()`) as PK, plus `UNIQUE(car_id, end_time)` constraint.

**Rationale**: `end_time` will be corrected (user mistype, OCR error). A mutating PK cascades to all FK references. UUID is stable; the UNIQUE constraint preserves the business rule (no two trips for the same car ending at the same instant). Duplicate inserts return 409 Conflict.

**Alternatives considered**:

- Composite PK `(car_id, end_time)`: natural dedupe and human-readable, but compound FKs in future tables (trip segments, notes) are painful, and editing `end_time` changes the PK.

### D2: `duration_min` — derive at read vs store

**Decision**: Derive from `end_time - start_time` at read time when `start_time` is present. Store `duration_min` only when `start_time` is NULL (manual entry without precise start).

**Rationale**: Single commuter = tiny dataset; `SUM(end - start)` over a month is milliseconds. Storing a precomputed duration risks staleness on edit. The column exists for the case where the user has only a duration but no start time.

### D3: `daypart` — stored enum vs derived at read

**Decision**: Compute from `end_time` at write time, store as `ENUM('morning', 'afternoon')`.

**Rationale**: Denormalized convenience. Source of truth is `end_time`, but storing the enum avoids re-deriving on every read and survives `start_time` being NULL. Extensible to `midday`, `night` later without rename. Rule: if `end_time` hour < 12 → `morning`, else `afternoon`.

### D4: Locations table with coordinates + timezone

**Decision**: Separate `locations` table with `latitude` `DECIMAL(9,6)`, `longitude` `DECIMAL(9,6)`, `timezone` `TEXT` (IANA name). Trips reference `start_location_id` and `end_location_id` (both nullable FKs).

**Rationale**: Coordinates in decimal degrees are directly passable to weather APIs (OpenWeather, MET Norway). No PostGIS extension needed for this slice — plain decimal columns are sufficient. Timezone stored per-location so display timezone is self-contained per record.

**Alternatives considered**:

- PostGIS `GEOGRAPHY(POINT, 4326)`: more standard for spatial queries, but adds extension + complexity. Migratable later if radius/search needed.
- Per-trip timezone column: redundant with location, error-prone.

### D5: Display timezone resolution — location tz with config fallback

**Decision**: Display timezone resolved as: `end_location.timezone` → if null, `start_location.timezone` → if null, app config default (`DISPLAY_TZ` env var, default `Europe/Copenhagen`).

**Rationale**: Denmark commuter today → all locations `Europe/Copenhagen`, so this equals a single config var. But survives travel ("drove to Germany") and future multi-location. "Current month" boundary math happens at app layer: compute month start/end in display tz, convert to UTC bounds, query `end_time` in UTC range.

### D6: Speed and consumption — stored rates (Path A)

**Decision**: `avg_speed_kmh` and `avg_consumption_kwh_100km` stored directly as provided by the car dashboard. Both nullable (not every trip will have them).

**Rationale**: The car displays averages, not raw energy/time. Storing rates matches input reality. Raw values (total kWh, total minutes) are not always available, so deriving is not always possible. Accept the tradeoff: cannot recompute or change the formula later for historical trips.

### D7: Migration tooling — dbmate

**Decision**: Use dbmate (already installed as dev dep). SQL migration files in `db/migrations/` with up/down pairs. Local: `bunx dbmate up` against docker-compose Postgres. Prod: run manually.

**Rationale**: Pure SQL migrations (no DSL), built-in up/down rollback, language-agnostic. Fits the "keep it simple" constraint. No custom Bun runner to maintain.

### D8: API validation — Hono built-in + manual

**Decision**: Use Hono's built-in validator middleware (or manual validation in handler). Validate required fields, types, and ranges before insert. Return `400` with field-level error messages on failure.

**Rationale**: No Zod or external validation library (dep constraint). Hono validators + manual checks are sufficient for the trip input shape.

## Ris / Trade-offs

- **[Risk] Timezone boundary off-by-one** → Mitigation: use inclusive start / exclusive end UTC bounds for month queries. Test edge cases (trip at midnight, DST transition).
- **[Risk] `UNIQUE(car_id, end_time)` rejects legitimate edge case** (two trips ending same minute) → Mitigation: extremely unlikely for single-car commuter. Return 409 with clear message; user adjusts `end_time` by a minute.
- **[Risk] Stored rates cannot be recomputed** → Accepted tradeoff. Document that historical averages are dashboard-reported, not derived.
- **[Risk] dbmate down migration drops all tables** → Mitigation: only run `dbmate down` in dev. Prod migrations are manual and forward-only in practice.
- **[Trade-off] No PostGIS** → Accepted. Plain decimals suffice. Migration path to PostGIS exists if spatial queries are needed later.
