## Context

See `proposal.md` — Why. The `locations` table is a 2-row lookup whose only live consumer is coordinate resolution for weather fetching. After the timezone column was dropped, the table's sole remaining payload is `{label, latitude, longitude}` for exactly two rows ("home", "work"). The database is not live; development can drop and rebuild freely. Three migrations currently exist (`init`, `use_nanoid_keys`, `rename_trip_columns`) plus a seed migration that inserts both vehicles and locations. This change consolidates the DDL into a single init migration and removes the locations table entirely.

## Goals / Non-Goals

**Goals:**
- Eliminate the `locations` table and its FK indirection from the `trips` schema
- Store location as a closed enum (`home` | `work`) directly on the trip row
- Resolve weather coordinates from env vars (`HOME_LATLNG`, `WORK_LATLNG`) following the `DISPLAY_TZ` precedent
- Consolidate all DDL into a single init migration (nanoid PKs, unit-free names, `location_enum` from the start)
- Fail fast on missing/malformed coordinate env vars — no silent (0,0) fallback

**Non-Goals:**
- Supporting locations beyond home/work (the commute domain is closed; a third location would yield slightly wrong weather, which is acceptable)
- Geocoding or address-to-coordinate resolution
- Backward-compatible API field names (breaking rename is accepted; no external clients exist)
- Migrating existing production data (database is not live)

## Decisions

### Decision: `location_enum` PG enum type (not TEXT + CHECK)

Store `start_location` / `end_location` as `location_enum AS ENUM('home','work')` (nullable), matching the existing `daypart_enum` precedent.

**Alternatives considered:**
- `TEXT` with a `CHECK (value IN ('home','work'))` constraint — works but diverges from the `daypart_enum` house style. The enum type is more idiomatic for a closed set and gives type safety at the DB layer.
- `boolean` (home=false, work=true) — illegible in queries; loses null semantics (a nullable boolean is confusing).

**Rationale:** `daypart_enum` already establishes the pattern. A second enum type is consistent and self-documenting. The set is closed (commute domain), so the ALTER TYPE cost of extending it is a non-issue.

### Decision: Coordinates in env vars, fail-fast (not graceful skip)

`HOME_LATLNG` and `WORK_LATLNG` are comma-separated `lat,lng` strings read at trip-creation time when the corresponding location is non-null. Missing or malformed values throw a configuration error before the weather fetch.

**Alternatives considered:**
- Graceful skip (persist NULL weather when env unset) — silently produces missing weather data; the user asked for fail-fast. Silent wrong > loud wrong is backwards for a single-user tool where the user is also the operator.
- Cached/parsed-once-at-boot — env vars are deployment config, not per-request data; reading at call time (like `DISPLAY_TZ`) is the established pattern. No caching layer needed.

**Rationale:** `DISPLAY_TZ` already reads `process.env` at call time with a fallback. Coords have no safe fallback (0,0 is the current seed's wrong default), so fail-fast replaces the fallback. Matches the `DATABASE_URL` guard pattern for required env.

### Decision: Single consolidated init migration (not additive migration)

Rewrite `20260711220117_init.sql` to include the nanoid extension, `daypart_enum`, `location_enum`, `vehicles`, and `trips` (nanoid PKs, unit-free column names, SQL comments, enum location columns) in one file. Delete `20260712000001_use_nanoid_keys.sql` and `20260828140000_rename_trip_columns.sql`. Rewrite the seed migration to insert only the vehicle.

**Alternatives considered:**
- Additive migration (new file: add `location_enum`, add enum columns, backfill from FK join, drop FK columns, drop `locations` table) — preserves migration history but the database is not live, so history accuracy has no value. Leaves three migrations that describe a path nobody will ever walk again.
- Keep the existing migrations and add a fourth — accumulates dead migrations describing superseded schema states.

**Rationale:** The user explicitly wants to "pretend these were the requirements from the beginning" spec-wise. A single init migration matches that intent. Not live = no backfill needed = no data risk. Git history preserves the old migrations if ever needed.

### Decision: `coords.ts` helper module (not inline env reads)

Add `src/backend/utils/coords.ts` exporting a `locationCoords(label: "home" | "work"): { latitude: number, longitude: number }` function that parses `HOME_LATLNG`/`WORK_LATLNG` and throws on missing/malformed. This mirrors `src/backend/utils/dates.ts` (`displayTz()`).

**Alternatives considered:**
- Inline `process.env` reads in `createTrip` — scatters env parsing across the trip query; no single validation point for the fail-fast contract.
- A config module loaded at boot — overkill for two vars; `DISPLAY_TZ` is read lazily and so should these be.

**Rationale:** `displayTz()` is the precedent for lazy env reads in a utility module. `locationCoords()` is its coordinate analogue — same shape, same call site pattern.

## Risks / Trade-offs

- **Closed enum locks out third locations** → Acceptable per user: a non-commute trip would get slightly wrong weather (home/work coords used). The enum can be extended via `ALTER TYPE` if the need ever becomes real, but the domain is commute-only.
- **Breaking `POST /api/trips` field names** → No external clients exist; the HTML form is the only caller and is updated in the same change. Low risk.
- **Env var missing on a fresh deploy** → Fail-fast surfaces as a 500 on first trip creation. The error message names the missing var. Better than silent (0,0) weather. Mitigated by documenting required env vars in `.env` and the seed migration only inserting the vehicle (coords are env, not seed data).
- **Migration consolidation loses history** → Git retains the deleted migration files. Since the DB is not live, no applied-migration state needs reconciliation. `bunx dbmate up` on a fresh database produces the final schema directly.

## Migration Plan

1. Drop the development database (`bunx dbmate down` or `docker compose down -v`)
2. Rewrite `db/migrations/20260711220117_init.sql` with consolidated DDL
3. Delete `db/migrations/20260712000001_use_nanoid_keys.sql`
4. Delete `db/migrations/20260828140000_rename_trip_columns.sql`
5. Rewrite `db/migrations/20260818152358_seed--data.sql` to insert only the vehicle
6. Add `HOME_LATLNG` and `WORK_LATLNG` to `.env`
7. `bunx dbmate up` → fresh schema with `location_enum`, no `locations` table
8. Apply code changes (delete `locations.ts`, add `coords.ts`, edit query/types/validators/handlers/form)
9. `bun test` → verify green

**Rollback:** `git checkout` the deleted migration files and edited code; drop the dev DB; `bunx dbmate up` restores the pre-change schema. Since the DB is not live, there is no data to preserve.