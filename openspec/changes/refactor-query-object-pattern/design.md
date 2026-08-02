## Context

Today every database interaction lives inline in the HTTP layer:

- `src/db/client.ts` exports a `postgres(DATABASE_URL)` tagged-template client (third-party `postgres` v3.4.9) plus a `testConnection()` helper.
- `src/backend/handlers.ts` runs the `INSERT INTO trips … RETURNING *` and the `SELECT * FROM trips` (current-month) queries and hand-maps rows to response objects.
- `src/backend/validators.ts` runs existence/uniqueness probes (`SELECT id FROM vehicles/locations`, `SELECT 1 FROM trips WHERE vehicle_id=? AND end_time=?`) inline.
- `src/backend/home.ts` runs four multi-shape queries (latest-trip → vehicle, current-month aggregates, previous-month aggregates, trip list with location joins) and projects rows with an ad-hoc `asNumber()` helper that parses `NUMERIC`/`DECIMAL` columns returned as strings.

The `trips` table uses `NUMERIC(8,2)` / `NUMERIC(5,1)` / `NUMERIC(6,2)` / `NUMERIC(8,1)` columns, which Postgres drivers return as strings (confirmed by the existing `asNumber` workaround). `TIMESTAMPTZ` columns are returned as `Date` objects (current code calls `.toISOString()`). No schema change is part of this work.

Constraints: Bun runtime, PostgreSQL via dbmate migrations, conventional commits, feature branches (no worktrees), no new external dependencies.

## Goals / Non-Goals

**Goals:**

- Encapsulate all SQL behind one query object per domain (`trips`, `vehicles`, `locations`, `stats`), each method taking its parameters as plain typed arguments and returning typed objects.
- Make each query object the single owner of row → typed-object projection/parsing (including `NUMERIC → number`, `Date → ISO/string`, nullable fields), exporting the return types from the module.
- Replace the `postgres` package with Bun's built-in SQL client (`import { sql, SQL } from "bun"`), removing the runtime dependency.
- Keep all existing HTTP behavior, request/response contracts, and endpoints unchanged.

**Non-Goals:**

- No database schema or migration changes.
- No new public API endpoints or response-shape changes (projection output matches what handlers already produce).
- No ORM, query builder, or repository abstraction beyond the query-object pattern.
- No connection-pool tuning or transaction support beyond what the current single client offers (a transaction feature is out of scope).

## Decisions

### 1. Bun's built-in SQL client over `postgres`

`postgres` is replaced by `import { sql, SQL } from "bun"`. The default `sql` export connects to PostgreSQL using `DATABASE_URL` automatically (Bun loads `.env` natively, per project convention — no `dotenv`). It uses the same tagged-template interpolation syntax as the current client, so SQL strings port with minimal change.

`src/db/client.ts` becomes a thin module that constructs/exports the shared `sql` instance (using `new SQL(process.env.DATABASE_URL!)` for explicit, testable wiring) and keeps `testConnection()`. Query objects import this shared `sql` rather than the HTTP layer.

- **Alternative considered**: keep `postgres` and only extract queries. Rejected — the task explicitly requires dropping the dependency and using the built-in client.
- **Alternative considered**: construct a fresh `SQL` per query object. Rejected — a single shared connection matches the current design and avoids connection churn.

### 2. Query-object pattern: one module per domain, methods take params as arguments

New directory `src/db/queries/` with one file per domain:

- `trips.ts` — `createTrip(input)`, `findTripsByMonth({ startUtc, endUtc })`, `existsTripByVehicleAndEndTime({ vehicleId, endTime })`.
- `vehicles.ts` — `findVehicleById(id)`, `vehicleExists(id)`.
- `locations.ts` — `locationExists(id)`.
- `stats.ts` — `monthlyAggregates({ startUtc, endUtc, vehicleId? })`.

Each module exports a default/named object (e.g. `export const tripsQueries = { createTrip, findTripsByMonth, … }`) and the TypeScript types it returns (`TripRow`, `MonthlyAggregates`, etc.). Methods take a single typed params object or named args — typed arguments, not the Hono `Context`. Callers pass plain values.

- **Alternative considered**: class instances with methods. Rejected — a plain object literal of async functions is simpler, tree-shakeable, and needs no `this` binding concerns.
- **Alternative considered**: one generic `db` query helper with SQL strings passed in. Rejected — that keeps SQL in callers and defeats the goal of centralization.

### 3. Projection/parsing lives inside the query objects

Each query object owns the full row → typed-object mapping:

- `NUMERIC`/`DECIMAL` columns (returned as strings by Bun SQL, same as `postgres`) → `number | null` via a shared `toNumber` util (moved from `home.ts` `asNumber`).
- `TIMESTAMPTZ` columns → parsed to Luxon `DateTime` **in UTC** (`DateTime.fromISO(value.toISOString(), { zone: "utc" })`) inside the query object, so the row type exposes `DateTime` directly — no native `Date` crosses the boundary. This removes the current `home.ts` `DateTime.fromISO(trip.start_time.toISOString())` round-trip: the query object hands callers a UTC `DateTime` ready to use. The HTTP API layer formats to ISO (`toISO()` / `toUTC().toISO()`) for JSON responses; views (e.g. `home.ts`) keep applying the display timezone via `.setZone(displayTz)` when formatting for display, exactly as today.
- Nullable columns typed as `T | null`.
- The exported return types become the contract handlers consume; handlers no longer do per-field mapping.

The DB-concern conversion helpers move to `src/db/convert.ts` (not `src/utils/`), keeping a clear separation: `src/db/` owns anything tied to how the database returns values (driver string numerics, `TIMESTAMPTZ` → `DateTime`), while `src/utils/` stays for UI/formatting concerns (timezone display, number formatting). `convert.ts` exports `toNumber(value: string | null | undefined): number | null` (moved from `home.ts` `asNumber`) and `toUtcDateTime(value: Date): DateTime` (Luxon, `{ zone: "utc" }`), both reused by `stats.ts`/`trips.ts`.

### 4. Validators consume existence query objects

`validators.ts` keeps its `hono/validator` wrappers and problem-details error shape, but replaces inline `db\`SELECT id …\`` calls with `vehicles.vehicleExists(id)`, `locations.locationExists(id)`, `trips.existsTripByVehicleAndEndTime(…)`. The validators stay responsible for translating "not found" → `ProblemDetailsError`; the query objects just return boolean/row and never throw business errors.

### 5. Dependency removal

After all callers migrate, remove `"postgres": "3.4.9"` from `package.json` via `bun remove postgres`. `Bun.sql` is built-in, so no install is needed. The `testConnection()` helper is rewritten to use the new `sql`.

## Risks / Trade-offs

- **[Bun SQL return-type differences from `postgres`]** → Bun SQL also returns large `NUMERIC`/`INT8` as strings by default (matches existing `asNumber` behavior). Mitigation: projection in query objects normalizes all numeric fields explicitly; existing tests assert response shapes and will catch regressions.
- **[TIMESTAMPTZ parsing differs between drivers]** → Both `postgres` and Bun SQL return `TIMESTAMPTZ` as `Date` objects; the query objects normalize these to Luxon `DateTime` (UTC) so callers never touch native `Date`. Mitigation: parse via `DateTime.fromISO(date.toISOString(), { zone: "utc" })`; views keep `.setZone(displayTz)` for display; covered by `home.test.ts`/`handlers.test.ts`.
- **[Default `sql` vs explicit `new SQL(DATABASE_URL)`]** → Relying on Bun's default `sql` reads `DATABASE_URL` implicitly; explicit construction is clearer for tests and matches the current fail-fast check. Mitigation: explicit `new SQL(DATABASE_URL)` with the existing missing-env guard.
- **[Missing-env error path]** → Current `client.ts` throws synchronously at import. Keep that behavior so misconfiguration fails fast.
- **[Test coverage of new modules]** → New query modules need tests for projection/parsing. Mitigation: add `src/db/queries/*.test.ts` using `bun test`, exercising parsing with representative rows (string numerics, nullables, dates).

## Migration Plan

1. Add `src/db/queries/` modules and the shared numeric-parse util; rewrite `src/db/client.ts` to `Bun.sql`. (No callers changed yet.)
2. Migrate `handlers.ts` to use `trips` query object.
3. Migrate `home.ts` to use `trips` + `vehicles` + `stats` query objects.
4. Migrate `validators.ts` to use existence query objects.
5. Remove the `postgres` import everywhere; `bun remove postgres`.
6. Run `bun test` and `docker build .`; verify all existing tests pass and add new query-module tests.

Rollback: revert the commits; `bun install` restores `postgres`; no DDL/data migration involved.

## Open Questions

None material to the approach. (Driver-specific `TIMESTAMPTZ`/`NUMERIC` edge cases will be verified by the existing test suite during implementation; if a divergence surfaces it is a within-task fix, not a design change.)
