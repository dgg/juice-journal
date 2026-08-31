## Why

The `locations` table stores exactly two rows ("home", "work") whose only live purpose is providing coordinates for weather fetching. After the timezone column was dropped (archived `2026-08-26-use-luxon-datetime-for-trips`), the table is a 2-row FK lookup with no other consumer. Its seed inserts coordinates at (0,0) that must be hand-patched post-migration for confidentiality. Storing coordinates as environment variables (matching `DISPLAY_TZ` precedent) eliminates the table, the FK indirection, and the confidentiality dance — while the home/work convention stays as a closed enum on the trip row.

## What Changes

- **BREAKING** Replace `locations` table + `start_location_id`/`end_location_id` FK columns with a `location_enum AS ENUM('home','work')` stored directly on `trips` (`start_location`, `end_location`, nullable).
- **BREAKING** `POST /api/trips` field names change: `start_location_id` (UUID) → `start_location` ("home"|"work"|null); same for end.
- Resolve location coordinates for weather from `HOME_LATLNG` / `WORK_LATLNG` environment variables (comma-separated `lat,lng`). Fail-fast if unset when a location is referenced (no silent (0,0) fallback).
- Drop `locations` query module, FK validators (`validateStartLocation`, `validateEndLocation`), and the seed migration's locations INSERT.
- Form renders a fixed home/work dropdown (no DB lookup); default by daypart unchanged (morning: home→work, afternoon: work→home).
- Consolidate all DDL migrations into a single `init` migration (nanoid PKs, unit-free column names, `location_enum` from the start). Seed migration keeps only the vehicle insert. Not live — no backfill needed.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `trips-api`: locations table removed; `start_location`/`end_location` enum columns replace FK columns; migration consolidation (single init, seed vehicles only)
- `trip-input-form`: location dropdown is a fixed home/work pair (no DB query); presets by daypart unchanged
- `trip-weather`: coordinates resolved from `HOME_LATLNG`/`WORK_LATLNG` env vars; fail-fast if missing
- `request-validation`: location FK validation removed; `start_location`/`end_location` enum validation in Zod schema

## Impact

- DB schema: drop `locations` table, add `location_enum`, replace 2 FK columns with 2 enum columns
- Migrations: rewrite `20260711220117_init.sql`, delete `20260712000001_use_nanoid_keys.sql` and `20260828140000_rename_trip_columns.sql`, rewrite seed migration
- Code: delete `src/backend/db/queries/locations.ts`; add `src/backend/utils/coords.ts`; edit `trips.ts`, `types.ts`, `validators.ts`, `presentation/trips.tsx`
- Env: add `HOME_LATLNG`, `WORK_LATLNG` to `.env` (gitignored coordinates)
- API: breaking field rename on `POST /api/trips` (no external clients currently)
- Rollback: restore deleted migration files from git, drop `location_enum`, recreate `locations` table, restore FK columns, restore `locationsQueries` module