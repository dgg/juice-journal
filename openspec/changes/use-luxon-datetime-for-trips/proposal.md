## Why

Trip creation models represent `start_time`/`end_time` as strings, forcing repeated string↔DateTime round-trips (form path builds a DateTime, serializes it back to a string, then re-parses it in `createTrip`). The `locations.timezone` column is dead weight — every caller of `resolveDisplayTz` passes `(undefined, undefined, DISPLAY_TZ)`, so the location-fallback chain is unreachable. Both create friction and lie about the real invariant: timestamps are UTC the moment they cross the input boundary.

## What Changes

- **BREAKING**: `tripInputSchema` gains a `.transform()` on `start_time`/`end_time` that parses the ISO+offset string via `DateTime.fromISO(s, { setZone: true }).toUTC()`. `TripInput` becomes `z.output` (DateTime fields); a new `TripInputRaw` (`z.input`) names the string shape.
- **BREAKING**: The five `validator("json")` middlewares (`vehicleValidator`, `startLocationValidator`, `endLocationValidator`, `tripConflictValidator`, plus the implicit odometer check) collapse into one async middleware that reads `c.req.valid("json")` (the transformed value) and runs all checks. The `req` parameter path is abandoned — it re-parses the body and overwrites the transform.
- **BREAKING**: `locations.timezone` column is dropped from the `locations` table (migration edit + seed edit, acceptable pre-launch). `TripWithLocationRow.start_tz`/`end_tz` fields, their SELECT columns, and their mappers are removed.
- `resolveDisplayTz(endLocTz?, startLocTz?, fallback)` → `displayTz()`: returns `process.env.DISPLAY_TZ || "Europe/Copenhagen"`. Dead fallback chain deleted.
- `currentMonthBoundsUtc` / `prevMonthBoundsUtc` / week / year / `periodBoundsUtc` return `{ startUtc: DateTime; endUtc: DateTime }` (UTC) instead of `{ startUtc: string; endUtc: string }`. Callers and query params updated.
- New `fromUtcDateTime(dt: DateTime): string` helper in `src/db/convert.ts` mirrors `toUtcDateTime`. All DB writes use it (Bun.SQL cannot serialize Luxon DateTime — verified by spike: produces `2000-01-01` garbage).
- `createTrip` weather params use `input.start_time` directly (no `DateTime.fromISO(input.start_time, {zone:"UTC"})` re-parse).
- Form path (`parseFormTripInput`) emits local-offset ISO (`+02:00`) instead of UTC `Z`, so the form behaves like any API client passing its offset — one rule, one transform path.
- Dead `Trip` interface (`src/backend/types.ts:30`) and `src/check.ts` spike file deleted.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `date-handling`: `resolveDisplayTz` replaced by `displayTz()`; bounds functions return UTC `DateTime` instead of ISO strings.
- `trips-api`: `locations.timezone` column removed; display-timezone resolution no longer consults location columns; trip input internally carries `DateTime` (UTC) from the validation boundary onward.
- `trip-input-form`: form handler emits local-offset ISO string (preserving `DISPLAY_TZ` offset) for schema transform consumption, instead of pre-converting to UTC `Z`.
- `request-validation`: `tripInputSchema` gains the DateTime transform; `TripInput` type derived from `z.output`; five validator middlewares collapse into one.

## Impact

- **Code**: `src/backend/types.ts`, `src/backend/validators.ts`, `src/backend/handlers.ts`, `src/backend/html-handlers.tsx`, `src/backend/home.tsx`, `src/backend/stats.tsx`, `src/backend/index.ts`, `src/db/convert.ts`, `src/db/queries/trips.ts`, `src/db/queries/stats.ts`, `src/utils/dates.ts`, `src/backend/weather/recorder.test.ts`.
- **DB schema**: edit `db/migrations/20260711220117_init.sql` (drop `timezone` column) and `db/migrations/20260818152358_seed--data.sql` (drop tz from INSERT).
- **API**: no public endpoint shape change — inputs still accept ISO+offset strings, outputs still emit ISO strings. Internal type changes only.
- **Dependencies**: none added (Luxon already in stack).
- **Rollback**: revert the feature branch. Since migrations are edited in place (pre-launch), `bunx dbmate down && bunx dbmate up` reapplies the original schema. No data migration needed — no live data exists.
