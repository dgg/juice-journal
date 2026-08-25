## Context

Trip creation currently round-trips `start_time`/`end_time` through strings: the form path builds a Luxon `DateTime`, serializes it back to ISO, then `createTrip` re-parses it with `DateTime.fromISO(..., {zone:"UTC"})`. The `locations.timezone` column and `resolveDisplayTz`'s location-fallback chain are dead — every caller passes `(undefined, undefined, DISPLAY_TZ)`. See `proposal.md` for the full motivation.

Two spikes shaped this design:

1. **Bun.SQL + Luxon DateTime spike**: inserting a Luxon `DateTime` directly into a `timestamptz` column produced `2000-01-01T00:00:00.000Z` (garbage). Inserting `.toISO()` string produced the correct value. Bun.SQL cannot serialize Luxon `DateTime`.
2. **Hono validator chaining spike**: `zValidator` with a `.transform()` stores the transformed value in `c.req.valid("json")`. Subsequent `validator("json")` middlewares receive the RAW body via their `req` parameter (re-parsing overwrites the transform), but CAN read the transformed value via `c.req.valid("json")`. Returning `req` from a custom validator overwrites the transform; returning `c.req.valid("json")` preserves it.

## Goals / Non-Goals

**Goals:**
- One validation boundary chokepoint: ISO+offset string in → UTC `DateTime` out, via schema transform.
- UTC `DateTime` invariant from validation boundary through DB write and DB read.
- Symmetric DB convert helpers: `toUtcDateTime(Date)→DateTime` (read) and `fromUtcDateTime(DateTime)→string` (write).
- Remove dead `locations.timezone` column and `resolveDisplayTz` fallback chain.
- Bounds functions return UTC `DateTime` (completes the invariant; callers serialize via `.toISO()` at the SQL boundary).

**Non-Goals:**
- Changing the public API shape (inputs still accept ISO+offset strings, outputs still emit ISO strings).
- Supporting overnight trips.
- Adding new dependencies (Luxon already in stack).
- Changing the `daypart` enum, duration derivation, or odometer logic.

## Decisions

### D1: Schema transform as the single chokepoint

`tripInputSchema` gains `.transform(s => DateTime.fromISO(s, { setZone: true }).toUTC())` on `start_time`/`end_time`. `setZone: true` makes Luxon adopt the offset from the string (so `+02:00` becomes the zone, then `.toUTC()` normalizes). This handles both API clients (any offset) and the form (DISPLAY_TZ offset) uniformly.

**Alternative considered**: transform in `parseFormTripInput` only, leave API path on strings. Rejected — leaves two code paths, two type shapes, defeats the invariant.

### D2: `TripInput` = `z.output`, `TripInputRaw` = `z.input`

`TripInput` (DateTime fields) is what validators, `createTrip`, and handlers see. `TripInputRaw` (string fields) is what `parseFormTripInput` returns and what API clients send. `tripInputSchema.parse(raw: TripInputRaw): TripInput` is the boundary crossing.

### D3: Collapse five validator middlewares into one

Single async middleware reads `c.req.valid("json")` (the transformed `TripInput`), runs all five checks (vehicle, start location, end location, conflict, odometer) sequentially, throws on first failure. Mirrors `htmlCreationHandler`'s pattern. Eliminates the `req`-param footgun.

**Alternative considered (Option A)**: fix each `validator("json")` to read `c.req.valid("json")` and return it. Rejected — 5 middlewares doing the same `c.req.valid` dance is noise; one middleware is simpler.

### D4: `fromUtcDateTime(dt) → string` write helper

Mirrors `toUtcDateTime(Date) → DateTime`. All DB writes use `fromUtcDateTime(input.start_time)`. Asserts the UTC invariant (the helper can validate `dt.zoneName === "utc"` in dev). Required because Bun.SQL cannot serialize Luxon DateTime (spike-confirmed).

### D5: Form path emits local-offset ISO

`parseFormTripInput` builds `DateTime.fromISO(date+"T"+time, {zone: displayTz})` and emits `.toISO()` (which carries the DISPLAY_TZ offset, e.g. `+02:00`), NOT `.toUTC().toISO()` (which emits `Z`). One rule: inputs carry their offset, transform normalizes. Form behaves like any API client.

### D6: Bounds functions return `DateTime`

`currentMonthBoundsUtc`, `prevMonthBoundsUtc`, week/year variants, `periodBoundsUtc` return `{ startUtc: DateTime; endUtc: DateTime }` (zone UTC). Query layer serializes via `.toISO()` at the SQL boundary. Completes the "DateTime everywhere past boundary" invariant.

### D7: Drop `locations.timezone` column

Edit `db/migrations/20260711220117_init.sql` (remove `timezone TEXT NOT NULL` from `locations`) and `db/migrations/20260818152358_seed--data.sql` (remove `timezone` from INSERT). Pre-launch — acceptable to edit migrations in place.

## Risks / Trade-offs

- **[Hono `validator("json")` re-parses body]** → Mitigated by D3: single middleware reads `c.req.valid("json")`, never the `req` param. Spike-confirmed.
- **[Bun.SQL DateTime serialization garbage]** → Mitigated by D4: all writes use `fromUtcDateTime` → `.toISO()` string. Spike-confirmed.
- **[Bounds return-type change ripples into stats queries]** → `statsQueries.periodAggregates` and all `findTrips*` params change from `string` to `DateTime`. Callers serialize via `.toISO()`. Larger blast radius, accepted for invariant completeness.
- **[Migration edit breaks existing DBs]** → Pre-launch, no live data. `bunx dbmate down && bunx dbmate up` reapplies. Rollback = revert branch.
- **[Transform in `zValidator` not visible to LSP types of custom validators]** → The `validator("json")` `req` param is typed as `unknown`/inferred from body; reading `c.req.valid("json")` requires a cast to `TripInput`. Acceptable — one cast site, in the single middleware.

## Migration Plan

1. Branch `feat/use-luxon-datetime-for-trips`.
2. Edit migrations (drop `timezone`), run `bunx dbmate down && bunx dbmate up` locally.
3. Implement schema transform + type split.
4. Collapse validators into one middleware.
5. Add `fromUtcDateTime`, update `createTrip` and all query params.
6. Update bounds functions to return `DateTime`, update all callers.
7. Replace `resolveDisplayTz` with `displayTz()`, update 11 call sites.
8. Update form path to emit local-offset ISO.
9. Delete dead `Trip` interface and `src/check.ts`.
10. Run `bun test`, fix failures.
11. `docker build .` to verify container.

**Rollback**: revert the branch. Re-run original migrations. No data migration needed (no live data).
