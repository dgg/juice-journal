## Context

Trip listing (`GET /api/trips`) needs a current-month window in a display timezone. Today this lives inline in `src/backend/handlers.ts:72-108` as native `Date` + `Intl.DateTimeFormat` part-picking, with a self-described "simplified approach" that only honors the `DISPLAY_TZ` env var — not the location-timezone fallback the `trips-api` spec already mandates (`end_location.timezone` → `start_location.timezone` → `DISPLAY_TZ`). Native `Date` math is also fragile around DST transitions and month boundaries.

The project stack (AGENTS.md) already names Luxon for date handling; it is not yet installed. This change adds Luxon as an approved dependency and centralizes date logic in one tested utility module.

Constraints:

- Backend only; no frontend, schema, or API-shape changes.
- Conventional commits, feature branches (no worktrees).
- Bun test runner; Pino logging.

## Goals / Non-Goals

**Goals:**

- Replace native `Date`/`Intl.DateTimeFormat` month-boundary code with Luxon-backed utilities.
- Implement the full display-timezone fallback chain to match the existing `trips-api` spec.
- Centralize date logic in `src/utils/dates.ts` with unit-testable pure functions.
- Keep API request/response shapes and DB queries unchanged.

**Non-Goals:**

- Rewriting `start_time`/`end_time` storage (stays timestamptz UTC in Postgres).
- Changing the `daypart` enum or `duration_min` precedence rules.
- Frontend date formatting (HTMX layer untouched).
- Supporting arbitrary historical months via query params — still current-month only.

## Decisions

### Decision 1: Add Luxon as the sole date library

**Choice:** Install `luxon`; use `DateTime` for all timezone-aware computation.

**Rationale:** Luxon has first-class IANA timezone support without manual UTC offsets, handles DST automatically, and is already sanctioned in the stack. The alternative — keeping native `Date` — is exactly the fragility being removed.

**Alternatives considered:**

- _date-fns-tz_: functional API, butLuxon's `DateTime` with a `zone` argument maps more directly to "compute month bounds in a display tz". date-fns is not in the stack and would add two packages.
- _Temporal (TC39 proposal)_: not shipped in Bun yet; not a safe dependency.

### Decision 2: Module `src/utils/dates.ts` with two pure functions

**Choice:** Expose:

- `resolveDisplayTz(endLocationTz?: string | null, startLocationTz?: string | null, fallback?: string): string`
- `currentMonthBoundsUtc(zone: string, now?: DateTime): { startUtc: string; endUtc: string }`

**Rationale:** Pure functions are trivially unit-testable (inject `now`) and keep handlers thin. `resolveDisplayTz` implements the fallback chain; `currentMonthBoundsUtc` computes inclusive-start / exclusive-end in the resolved zone then converts to UTC ISO strings for the existing `WHERE end_time >= ... AND end_time < ...` query.

**Alternative considered:** a single `getTripsWindow(now)` function tied to a DB lookup — rejected because it couples date logic to the data layer and hides the timezone resolution from unit tests.

### Decision 3: Timezone resolution stays in the handler, not the utility

**Choice:** The handler fetches location timezones (or accepts them as args in tests) and passes them to `resolveDisplayTz`. The utility performs no DB access.

**Rationale:** Keeps `dates.ts` free of `db` imports, preserving the existing separation where `src/db/client.ts` is the only DB touchpoint.

### Decision 4: Pass `DateTime.now()` injectable for tests

**Choice:** `currentMonthBoundsUtc(zone, now = DateTime.now())` accepts an optional `now`.

**Rationale:** Month-boundary tests need deterministic "today" values; injecting `now` avoids faking the system clock.

## Risks / Trade-offs

- **[Risk] Luxon dependency added → must stay within allowed deps.** Mitigation: AGENTS.md already lists Luxon as the stack's date library; this is the sanctioned install. Human approval step explicitly flagged in tasks.
- **[Risk] DST edge changes boundary output vs. old code.** Mitigation: This is the _correct_ behavior (the old code's "simplified approach" was the bug). Add a test mirroring the spec's "Timezone boundary at month edge" scenario to lock it in.
- **[Risk] ISO string format differs from `Date.toISOString()`.** Mitigation: Luxon's `toISO()` produces the same `YYYY-MM-DDTHH:mm:ss.sssZ` shape Postgres accepts; add an assertion test comparing formats.
- **[Trade-off] Two small functions vs. inline.** Slightly more indirection, but buys testability and a single source of truth for month math.

## Migration Plan

No schema or data migration. Deploy steps:

1. `bun install luxon` (after human approval).
2. Add `src/utils/dates.ts` and its test.
3. Refactor `getTrips` to call the utilities.
4. `bun test` green; `docker build .` passes.

Rollback (from proposal): revert handler, delete util, `bun remove luxon`. No data to undo.

## Open Questions

- Should `resolveDisplayTz` log the resolved zone at info level (useful for debugging month-boundary issues)? Proposal: yes, via the existing `c.var.logger` in the handler rather than inside the pure utility, to keep `dates.ts` side-effect-free.
