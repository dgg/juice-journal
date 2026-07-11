## 1. Project Setup & Dependencies

- [ ] 1.1 Install `hono` runtime dependency (`bun add hono`)
- [ ] 1.2 Add `.env` file with `DATABASE_URL` pointing to docker-compose Postgres (e.g. `postgres://juice_journal_usr:juice_journal_pwd@localhost:5432/juice_journal_db`)
- [ ] 1.3 Add `DISPLAY_TZ=Europe/Copenhagen` to `.env`
- [ ] 1.4 Add `.env` to `.gitignore` if not already present
- [ ] 1.5 Create `db/` directory for dbmate migrations (dbmate default)
- [ ] 1.6 Verify `bunx dbmate --version` runs successfully

## 2. Database Schema Migration

- [ ] 2.1 Create initial up migration `db/migrations/YYYYMMDDHHMMSS_init.up.sql` with: `schema_migrations` table (dbmate manages), `vehicles` table (id UUID PK, description TEXT, created_at, updated_at), `locations` table (id UUID PK, label TEXT, latitude DECIMAL(9,6), longitude DECIMAL(9,6), timezone TEXT, created_at, updated_at), `trips` table (id UUID PK default gen_random_uuid(), vehicle_id UUID FK NOT NULL, start_time TIMESTAMPTZ NOT NULL, end_time TIMESTAMPTZ NOT NULL, start_location_id UUID FK NULL, end_location_id UUID FK NULL, daypart daypart_enum NOT NULL, duration_min INT NOT NULL, distance_km NUMERIC(8,2) NOT NULL, avg_speed_kmh NUMERIC(5,1) NULL, avg_consumption_kwh_100km NUMERIC(6,2) NULL, weather_start JSONB NULL, weather_end JSONB NULL, odometer_km NUMERIC(8,1) NULL, tracking_created TIMESTAMPTZ DEFAULT now(), tracking_updated TIMESTAMPTZ DEFAULT now(), UNIQUE(vehicle_id, end_time))
- [ ] 2.2 Create matching down migration `YYYYMMDDHHMMSS_init.down.sql` dropping tables in FK order: trips, locations, vehicles, then the daypart enum type
- [ ] 2.3 Create `daypart` enum type (`CREATE TYPE daypart_enum AS ENUM('morning', 'afternoon')`) in the up migration before the trips table
- [ ] 2.4 Start docker-compose Postgres (`docker compose up -d`)
- [ ] 2.5 Run `bunx dbmate up` and verify all tables exist
- [ ] 2.6 Run `bunx dbmate down` then `bunx dbmate up` again to verify rollback works

## 3. Database Client

- [ ] 3.1 Create `src/db/client.ts` exporting a singleton `Bun.sql` instance configured from `DATABASE_URL` env var
- [ ] 3.2 Verify the client connects to Postgres (simple `SELECT 1` test)

## 4. Hono Server Entrypoint

- [ ] 4.1 Create `src/backend/index.ts` with a Hono app, listening on `PORT` env var (default 3000)
- [ ] 4.2 Add a health check route `GET /api/health` returning `200` `{ "status": "ok" }`
- [ ] 4.3 Verify server starts with `bun run src/backend/index.ts`

## 5. POST /api/trips Handler

- [ ] 5.1 Define the trip input type (required: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`; optional: `start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`)
- [ ] 5.2 Implement validation: check required fields present, validate types, validate `daypart` ∈ {`morning`, `afternoon`}, validate `distance_km > 0`, validate `vehicle_id` exists in `vehicles` table, validate location FKs if provided
- [ ] 5.3 Implement INSERT query with all fields (including `daypart` and `duration_min` from the request), returning the full row (including generated `id`, `tracking_created`, `tracking_updated`)
- [ ] 5.4 Handle `UNIQUE(vehicle_id, end_time)` violation → return `409 Conflict`
- [ ] 5.5 Return `201 Created` with the trip record as JSON on success
- [ ] 5.6 Return `400 Bad Request` with field-level error messages on validation failure

## 6. GET /api/trips Handler

- [ ] 6.1 Implement display timezone resolution: `end_location.timezone` → `start_location.timezone` → `DISPLAY_TZ` env (default `Europe/Copenhagen`)
- [ ] 6.2 Compute current month bounds in display timezone (first day of month 00:00 → first day of next month 00:00), convert to UTC
- [ ] 6.3 Query trips where `end_time >= month_start_utc AND end_time < month_end_utc`, sorted by `end_time` DESC
- [ ] 6.4 Return `200 OK` with JSON array of trip objects (empty array if no trips)

## 7. Tests

- [ ] 7.1 Test: `POST /api/trips` with valid input returns `201` and the created record with `daypart` stored from the request
- [ ] 7.2 Test: `POST /api/trips` missing `distance_km` returns `400` with field error
- [ ] 7.3 Test: `POST /api/trips` with invalid `vehicle_id` returns `400`
- [ ] 7.4 Test: `POST /api/trips` duplicate `(vehicle_id, end_time)` returns `409`
- [ ] 7.5 Test: `GET /api/trips` returns only current-month trips, sorted desc
- [ ] 7.6 Test: `GET /api/trips` with no trips returns `200` `[]`
- [ ] 7.7 Test: `duration_min` from request is stored as-is and returned in the response
- [ ] 7.8 Test: `POST /api/trips` with `daypart='evening'` returns `400` with a field error

## 8. Verification & Cleanup

- [ ] 8.1 Run `bun test` — all tests pass
- [ ] 8.2 Run `bun run src/backend/index.ts` and manually test endpoints with `curl` (POST then GET)
- [ ] 8.3 Run `bun run format:check` (prettier) — no errors
- [ ] 8.4 Run `docker build .` — image builds successfully
- [ ] 8.5 Update `index.ts` to start the Hono server instead of `console.log`
- [ ] 8.6 Add `dbmate` and `hono` to any dependency documentation if needed
