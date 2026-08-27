## Why

The `GET /api/trips` endpoint returns trips for the current month, but this data is now served exclusively via server-side rendered HTML (HTMX partials). The API endpoint is dead code — no client calls it. Removing it eliminates an unused code path, reduces maintenance surface, and simplifies the API surface.

## What Changes

- **BREAKING**: Remove `GET /api/trips` route and `getTrips` handler
- Remove unused imports from `handlers.ts` (`displayTz`, `currentMonthBoundsUtc`, `Env` type)
- Remove `getTrips` import from `index.ts`
- Delete entire `handlers.test.ts` (the whole file only tests `getTrips`)
- Keep `findTripsByMonth` query — still referenced by `weather/recorder.test.ts` and `db/queries/trips.test.ts`
- Keep all date utilities — `currentMonthBoundsUtc` is used by `home.tsx`, `html-handlers.tsx`, and `periodBoundsUtc` dispatcher

## Capabilities

This is a pure refactor/cleanup with no spec-level behavior changes. The `GET /api/trips` endpoint is removed but no behavior that users rely on changes — trip data is already served through SSR. Set `skip_specs: true` in `.openspec.yaml`.

## Impact

- **Removed**: `GET /api/trips` route from `src/backend/index.ts:61`
- **Removed**: `getTrips` import from `src/backend/index.ts:6`
- **Removed**: `getTrips` handler from `src/backend/handlers.ts:35-70`
- **Removed**: unused imports from `src/backend/handlers.ts:2,5`
- **Deleted**: entire `src/backend/handlers.test.ts` (only tested `getTrips`)