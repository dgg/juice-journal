## 1. Add the unique-existence pre-check validator

- [x] 1.1 Add `tripConflictValidator` to `src/backend/validators.ts`: a `validator("json", async (req: TripInput) => { ... })` that `SELECT 1 FROM trips WHERE vehicle_id = $1 AND end_time = $2 LIMIT 1`, throwing `problems.create("TRIP_CONFLICT", { detail: "A trip with this vehicle_id and end_time already exists", extensions: { vehicle_id: req.vehicle_id, end_time: req.end_time } })` when a row is found, otherwise returning `req`
- [x] 1.2 Wrap the `SELECT` in the same `ProblemDetailsError` pass-through `try/catch` shape used by `vehicleValidator`/`startLocationValidator`/`endLocationValidator`, rethrowing `ProblemDetailsError` and otherwise throwing a `TRIP_CONFLICT` "verification failed" problem

## 2. Wire the validator into the route chain

- [x] 2.1 Import `tripConflictValidator` in `src/backend/index.ts`
- [x] 2.2 Add it to the `POST /api/trips` chain after `vehicleValidator` and before `creationHandler`: `creationValidator → endLocationValidator → startLocationValidator → vehicleValidator → tripConflictValidator → creationHandler`

## 3. Simplify `creationHandler`

- [x] 3.1 Remove the `try/catch` and the `duplicate key` / `UNIQUE` / `unique` string-matching block from `creationHandler` in `src/backend/handlers.ts`
- [x] 3.2 Leave `creationHandler` performing only the `INSERT ... RETURNING *` and the `201` response shaping (no `try/catch`, no `problems` import usage for conflict)
- [x] 3.3 Remove the now-unused `problems` import from `src/backend/handlers.ts` if no other usage remains

## 4. Tests

- [x] 4.1 Add a `tripConflictValidator` test (or route-level test) asserting a pre-existing `(vehicle_id, end_time)` duplicate yields `409` `application/problem+json` with the `TRIP_CONFLICT` `type`, the expected `detail`, and `extensions.vehicle_id` / `extensions.end_time`
- [x] 4.2 Add a test asserting a non-duplicate request passes the pre-check and reaches `creationHandler` (returns `201`)
- [x] 4.3 Add/update a test asserting the FK check rejects with `422` before the unique pre-check queries `trips` (ordering verification)
- [x] 4.4 Add a test asserting a race-style `UNIQUE` violation at INSERT time (mock/simulate the DB error) propagates uncaught and produces `500`, not `409`
- [x] 4.5 Update any existing `creationHandler` duplicate test that relied on the handler's `try/catch` to instead target `tripConflictValidator` / the route chain
- [x] 4.6 Run `bun test` and ensure all tests pass

## 5. Lint, types, and build

- [x] 5.1 Run typecheck/lint (`bun run` scripts or repo defaults) and resolve any errors
- [x] 5.2 Verify `docker build .` succeeds
- [x] 5.3 Confirm no new dependencies were added

## 6. Spec sync and validation

- [x] 6.1 Run `openspec validate move-unique-check-to-validator` and fix any reported issues
- [x] 6.2 Confirm the `request-validation` and `trips-api` delta specs match the implemented behavior
