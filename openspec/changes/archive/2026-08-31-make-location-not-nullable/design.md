## Context

The current trips table defines `start_location` and `end_location` as nullable `location_enum` columns. The Zod schema (`tripInputSchema`) marks them `.optional()`, the TypeScript types (`TripRow`, `TripWithLocationRow`) carry `| null`, and the form parser (`parseFormTripInput`) converts an empty dropdown value to `undefined`. This creates branching logic throughout the codebase: the `createTrip` query uses `?? null` fallbacks, the weather fetcher guards against null coords, and the TripRow component conditionally renders a route pill.

See proposal.md for the motivation. Specs are at `specs/trips-api/spec.md` and `specs/trip-input-form/spec.md`.

## Goals / Non-Goals

**Goals:**
- `start_location` and `end_location` are `NOT NULL` at the DB level
- Zod schema requires both fields
- All TypeScript types drop `| null` from location fields
- Query code, form parser, and frontend component simplify to assume locations are always present
- Weather lookup unconditionally fetches coords for both locations

**Non-Goals:**
- No new location types or values — still just `'home'` and `'work'`
- No change to other nullable fields (speed, consumption, odometer, weather)
- No change to the weather storage or coords lookup signatures beyond removing null guards

## Decisions

- **Modify existing init migration vs. add new migration**: Since no production data exists (compose is down, volume was deleted), the safest approach is to edit `db/migrations/20260711220117_init.sql` in-place, adding `NOT NULL` to the `start_location` and `end_location` column definitions. This avoids a second migration file and keeps schema history clean. The down migration already drops the table, so the edit is fully reversible.
- **No interim fan-out**: Since the DB, Zod schema, and types all change atomically in one commit (or closely sequenced), there is no need for a gradual rollout where the column is nullable at the DB level but the API requires it.
- **Form parser simplification**: The `|| undefined` fallback in `parseFormTripInput` becomes a direct cast — the value from the form body IS the value. If missing, Zod will reject it.
- **Weather fetch simplification**: `locationCoords` already takes non-nullable `Location`, so the `input.start_location ? locationCoords(...) : null` guards in `createTrip` become unconditional calls.
- **Frontend TripRow**: The conditional `{trip.start_location || trip.end_location ? ...}` always renders, and individual null guards inside the route pill are no longer needed.

## Risks / Trade-offs

- **No production data concern**: The compose environment was torn down and the volume deleted, so there are no existing rows with NULL locations. The init migration edit is safe — no backfill needed.
- **Coords ENV not set**: `locationCoords` throws if `HOME_LATLNG` or `WORK_LATLNG` is unset. Previously this was guarded by the null check; now it always runs. Mitigation: document that these ENV vars are required (they already are for weather to work) — if they are not set, the server will crash on trip creation, which surfaces the misconfiguration immediately rather than silently skipping weather.
- **BREAKING for API consumers**: Any client posting trips without `start_location` / `end_location` will get 422s. Rollback is straightforward — revert the init migration edit.