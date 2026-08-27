## Context

See proposal.md for motivation. The `GET /api/trips` endpoint and its handler are dead code — trip data is served exclusively via SSR (HTMX partials in `home.tsx` and `html-handlers.tsx`). The entire `handlers.test.ts` file only covers the removed handler.

`currentMonthBoundsUtc` and `findTripsByMonth` are kept — they are still used by `home.tsx`, `html-handlers.tsx`, `periodBoundsUtc`, and other test files.

## Goals / Non-Goals

**Goals:**
- Remove the `GET /api/trips` route and `getTrips` handler
- Clean up unused imports in `handlers.ts` and `index.ts`
- Remove the `handlers.test.ts` test file (only tests `getTrips`)

**Non-Goals:**
- Do not remove shared utilities (`currentMonthBoundsUtc`, `displayTz`, `Env` type) — they are used elsewhere
- Do not remove `findTripsByMonth` — referenced by `weather/recorder.test.ts` and `db/queries/trips.test.ts`
- Do not refactor `creationHandler` (co-located in `handlers.ts`, unchanged)

## Decisions

1. **Delete `handlers.test.ts` entirely** rather than extracting the `beforeAll`/`afterAll` helpers — the test data setup (`TEST_VEHICLE_ID`, `TEST_LOCATION_ID`) is only used by the removed tests. Extraction would leave orphaned helpers with no coverage value.

2. **Remove the `Env` type import from `handlers.ts`** — `creationHandler` uses bare `Context` (no typed env), so the import was only needed for `getTrips`.

3. **Keep `getTrips` import removal from `index.ts` focused** — the `/api/trips` route at line 61 is the only thing removed. The rest of the import line (`creationHandler`) stays.

## Risks / Trade-offs

- **[Low] `GET /api/trips` is a breaking API change** — no known callers, but any external integration would break. Mitigation: announcement in commit message (conventional commit `!` marker).
- **[None] Dead code removal** — zero risk since the endpoint is unused and tests are skipped (`describe.skip`).

## Migration Plan

1. Remove `getTrips` function from `handlers.ts` and its unused imports
2. Remove `getTrips` import and route from `index.ts`
3. Delete `handlers.test.ts`
4. Verify build (`bun run`) and tests (`bun test`)
5. Commit with conventional commit `feat!: remove GET /api/trips endpoint`