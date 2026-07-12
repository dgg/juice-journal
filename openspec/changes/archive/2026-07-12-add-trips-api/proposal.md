## Why

The app is greenfield — no data model, no API, no migrations exist. To start logging EV commute trips and eventually build analytics/UI, we need a foundation: database schema, migration tooling, and the minimal API to create and retrieve trips. This first slice delivers the data layer + write/read endpoints without any UI, proving the architecture end-to-end.

## What Changes

- Add `dbmate` as a dev dependency and configure it for local Postgres (docker-compose).
- Add the initial SQL migration creating three tables: `vehicles`, `locations`, `trips`.
- Add a Postgres client singleton (`Bun.sql`) in `src/db/client.ts`.
- Add Hono server entrypoint in `src/backend/index.ts` with two REST endpoints:
  - `POST /api/trips` — validate input, insert a trip, return `201` with the created record.
  - `GET /api/trips` — return trips for the current calendar month (based on display timezone), default to current month.
- `daypart`comes from request (derivation will happen at a later stage in the frontend) and stored as an enum.
- Trip `id` is a synthetic UUID; `UNIQUE(vehicle_id, end_time)` enforces no duplicate trips per vehicle.
- No UI, no HTMX, no Pico in this slice — API only.

## Capabilities

### New Capabilities
- `trips-api`: REST endpoints to create and retrieve commute trips, including input validation, timezone-aware "current month" filtering, and the trips/vehicles/locations data model.

### Modified Capabilities
<!-- None — greenfield, no existing specs -->

## Impact

- **New code**: `src/db/` (client, migrations runner config), `src/backend/` (Hono app, route handlers, validation).
- **New dependency**: `dbmate` (dev dep, already installed), `hono` (runtime dep, needs install).
- **Database**: initial migration creates `schema_migrations` (dbmate-managed), `vehicles`, `locations`, `trips` tables.
- **API surface**: two new public endpoints under `/api/trips`.
- **No breaking changes** — nothing existed before.

### Rollback Plan

- Drop the migration: `bunx dbmate down` (dbmate tracks `schema_migrations` table; down migration drops all tables).
- Remove new files: `src/db/`, `src/backend/`.
- Remove `hono` and `dbmate` from `package.json` (`bun remove hono dbmate`).
- No data to preserve — greenfield.
