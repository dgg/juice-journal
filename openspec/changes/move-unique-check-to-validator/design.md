## Context

`creationHandler` (`src/backend/handlers.ts`) wraps its `INSERT INTO trips` in a `try/catch` that string-matches `duplicate key` / `UNIQUE` / `unique` on the caught error and rethrows a `TRIP_CONFLICT` problem (`409`). The rest of the validation layer — Zod schema validation (`creationValidator`) and async foreign-key checks (`vehicleValidator`, `startLocationValidator`, `endLocationValidator`) — already runs as Hono `validator("json", ...)` middleware in `src/backend/validators.ts`, ordered before `creationHandler` in `src/backend/index.ts`. The FK validators establish the pattern: query the DB, throw a registry problem on failure, otherwise return the request value and let the handler stay thin.

The `request-validation` spec currently mandates (in its "Handler contains no FK logic" scenario) that `creationHandler` performs "the INSERT and conflict handling" — i.e. conflict handling is intentionally still in the handler. This change moves conflict detection out of the handler and into a validator, completing the separation.

## Goals / Non-Goals

**Goals:**

- Move the `UNIQUE(vehicle_id, end_time)` duplicate check out of `creationHandler` into a dedicated async `validator("json", ...)` middleware, mirroring the existing FK-check pattern.
- Reduce `creationHandler` to a single responsibility: the INSERT and response shaping.
- Stop relying on DB error-message string matching inside the handler.

**Non-Goals:**

- Changing the `UNIQUE(vehicle_id, end_time)` database constraint or any schema.
- Changing the public `409 TRIP_CONFLICT` contract for a pre-existing duplicate (preserved).
- Adding retry logic or a serializable transaction to close the race window.
- Changing the problem-type registry or any other endpoint.

## Decisions

### Decision 1: Proactive existence query in a new `tripConflictValidator`

Add `tripConflictValidator = validator("json", async (req: TripInput) => { ... })` in `src/backend/validators.ts`. It runs a `SELECT 1 FROM trips WHERE vehicle_id = $1 AND end_time = $2 LIMIT 1`; if a row is found it throws `problems.create("TRIP_CONFLICT", { detail, extensions: { vehicle_id, end_time } })`, otherwise returns `req`.

**Why over alternatives:** This is the exact pattern already used by `vehicleValidator` / `startLocationValidator` / `endLocationValidator`, so it is consistent, testable in isolation, and keeps the handler free of DB-introspection logic.
- *Alternative A (keep handler catch but parse `error.code === '23505'`):* rejected — still couples the handler to Postgres internals and contradicts the "handler does only the INSERT" goal.
- *Alternative B (DB-side `ON CONFLICT` returning a sentinel row):* rejected — would require shaping the error body inside the handler again, undoing the separation.

### Decision 2: Ordering — conflict check runs after the FK checks

In `src/backend/index.ts`, the chain becomes `creationValidator → endLocationValidator → startLocationValidator → vehicleValidator → tripConflictValidator → creationHandler`. The conflict check is placed last among validators because a duplicate `vehicle_id`/`end_time` only has meaning once we know the `vehicle_id` actually refers to a real vehicle; surfacing FK errors first gives the caller the most actionable error.

**Why:** Matches the existing "fail on the first meaningful problem" ordering already used for FK checks, and avoids a needless `trips` lookup when the request would fail FK validation anyway.

### Decision 3: Remove the handler `try/catch` entirely; do not catch the DB error

`creationHandler` loses its `try/catch` and becomes the bare INSERT + `201` response. If a row is inserted between the pre-check and the INSERT (a race), Postgres raises `23505`, which propagates uncaught to `app.onError` and becomes a `500` per the `error-handling` capability.

**Why:** This is the explicit user request — "let the error naturally surface if it actually happens." Catching the constraint error would reintroduce the DB-error introspection we are removing.
- *Alternative (pre-check + catch `23505` as a 409 fallback):* rejected by the request — it reintroduces handler-side error matching and muddies the contract (sometimes 409, sometimes the validator's 409).

### Decision 4: Mirror the FK validator's `ProblemDetailsError` pass-through

Wrap the `SELECT` in the same `try/catch` shape as the FK validators: if the thrown error is a `ProblemDetailsError` (i.e. our own `TRIP_CONFLICT`), rethrow it; otherwise throw a generic `TRIP_CONFLICT` describing a verification failure. This keeps the validator's failure surface consistent with its siblings and lets `app.onError` render the problem body.

## Risks / Trade-offs

- **[Race condition: duplicate inserted between pre-check and INSERT → `500` instead of `409`]** → Accepted tradeoff per the user's intent. Documented in the `trips-api` spec delta so the contract reflects reality. For a single-user personal commute tracker the window is negligible.
- **[Extra `SELECT` per create request]** → One indexed lookup on `UNIQUE(vehicle_id, end_time)`; negligible cost relative to the INSERT and the existing FK-check `SELECT`s. The unique index makes the lookup O(1)-ish.
- **[Spec wording drift: `trips-api` literally anchored 409 to the "UNIQUE constraint conflict"]** → Resolved by MODIFYING the `POST /api/trips` requirement to anchor 409 to "a trip with the same `vehicle_id` and `end_time` already exists", detected by the validation step.
- **[Two code paths can produce a "duplicate" response shape divergence]** → Mitigated by using the same `problems.create("TRIP_CONFLICT", ...)` registry entry in both the (now removed) handler path and the new validator, so the response shape is identical for the documented case.

## Migration Plan

1. Add `tripConflictValidator` to `src/backend/validators.ts`.
2. Wire it into the `POST /api/trips` route in `src/backend/index.ts` after `vehicleValidator`.
3. Remove the `try/catch` from `creationHandler`, leaving only the INSERT + `201` response.
4. Update/add tests: a duplicate-creation test against the validator (409); a `creationHandler` test asserting no `try/catch` / no `duplicate key` string matching remains.
5. Rollback: revert `creationHandler` to the original `try/catch` and remove `tripConflictValidator` from the route chain and file. No schema migration is involved, so rollback is a pure code revert.

## Open Questions

- Should the `500`-on-race be hardened later with `ON CONFLICT ... DO NOTHING` returning a sentinel (revisited if duplicate creations are ever observed in production)? Out of scope for this change.
