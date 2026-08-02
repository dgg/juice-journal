## 1. Dependency Setup

- [x] 1.1 Get human approval to install `luxon` (sanctioned in AGENTS.md stack but not yet a dependency)
- [x] 1.2 Run `bun install luxon` and confirm it appears in `package.json` dependencies
- [x] 1.3 Verify `bunx tsc --noEmit` (or repo typecheck command) recognizes the `luxon` import

## 2. Date Utility Module

- [x] 2.1 Create `src/utils/dates.ts` exporting `resolveDisplayTz(endLocationTz?, startLocationTz?, fallback = "Europe/Copenhagen")` implementing the fallback chain (treat `null`/`undefined`/empty string as missing)
- [x] 2.2 In `src/utils/dates.ts`, export `currentMonthBoundsUtc(zone, now = DateTime.now())` returning `{ startUtc: string; endUtc: string }` as inclusive-start / exclusive-end in the resolved zone, converted to UTC ISO strings
- [x] 2.3 Ensure neither function imports from `src/db/client.ts` (keep utilities pure and DB-free)

## 3. Utility Tests

- [x] 3.1 Create `src/utils/dates.test.ts` with a case for each `date-handling` spec scenario: end-location priority, start-location fallback, config fallback, empty-string handling
- [x] 3.2 Add month-bounds test cases: mid-month Copenhagen (UTC+2), UTC zone midnight bounds, exclusive-end excludes next-month first instant, DST-transition (March) boundary
- [x] 3.3 Run `bun test src/utils/dates.test.ts` and confirm all cases pass

## 4. Handler Refactor

- [x] 4.1 In `src/backend/handlers.ts` `getTrips`, replace the native `Date`/`Intl.DateTimeFormat` month-boundary block (`handlers.ts:74-108`) with calls to `resolveDisplayTz` and `currentMonthBoundsUtc`
- [x] 4.2 Pass `end_location.timezone` → `start_location.timezone` → `process.env.DISPLAY_TZ || "Europe/Copenhagen"` into `resolveDisplayTz` (closing the spec gap; current code only honors `DISPLAY_TZ`)
- [x] 4.3 Feed the returned `startUtc`/`endUtc` into the existing `WHERE end_time >= ${startUtc} AND end_time < ${endUTC}` query unchanged
- [x] 4.4 Log the resolved timezone and bounds via `c.var.logger.info` (keep logging in the handler, not the utility)
- [x] 4.5 Remove the now-dead `nextMonth`/`monthEnd` native `Date` code and the "simplified approach" comment

## 5. Handler/Integration Tests

- [x] 5.1 Review `src/backend/trips.test.ts` for existing `GET /api/trips` month-window tests; confirm they still pass against the Luxon implementation
- [x] 5.2 Add or update a test mirroring the spec's "Timezone boundary at month edge" scenario (last-day-of-month 23:59 Copenhagen trip included)
- [x] 5.3 Add a test asserting the location-timezone fallback takes priority over `DISPLAY_TZ` when an end location with a timezone is present
- [x] 5.4 Run `bun test` (full suite) and confirm green

## 6. Verification & Docs

- [x] 6.1 Run `bun test` — all tests pass
- [x] 6.2 Run `docker build .` — image builds successfully
- [x] 6.3 Confirm no new dependencies beyond `luxon` were introduced
- [x] 6.4 Update AGENTS.md stack note if needed to reflect Luxon as installed (already listed as the date library)
