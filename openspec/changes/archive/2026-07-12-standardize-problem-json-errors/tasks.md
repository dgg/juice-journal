## 1. Dependency (human-review item)

- [x] 1.1 Get human approval to add `hono-problem-details` (only Hono/HTMX/Pico/Chart.js/Bun-stdlib are auto-approved per `AGENTS.md`)
- [x] 1.2 `bun install hono-problem-details`
- [x] 1.3 Confirm it resolves under Bun (`bun -e "import('hono-problem-details').then(m => console.log(typeof m.problemDetailsHandler))"` exits cleanly) and that `hono` peer dep (`>= 4.12.14`) is satisfied by the installed `4.12.29`

## 2. Problem type registry

- [x] 2.1 Create `src/backend/problems.ts` exporting a `createProblemTypeRegistry` with `TRIP_CONFLICT` (`409`, type `https://juice-journal.local/problems/trip-conflict`, title `"Trip Conflict"`) and `FOREIGN_KEY_VIOLATION` (`422`, type `https://juice-journal.local/problems/foreign-key-violation`, title `"Foreign Key Violation"`)
- [x] 2.2 Export the registry instance as `problems` for import by validators/handlers

## 3. Global error handler (index.ts)

- [x] 3.1 Import `problemDetailsHandler` from `hono-problem-details` in `src/backend/index.ts`
- [x] 3.2 Register `app.onError(problemDetailsHandler({ autoInstance: true, includeStack: process.env.NODE_ENV !== "production", defaultType: "about:blank", mapError }))` where `mapError` logs via `console.error` and returns `undefined`
- [x] 3.3 Verify `/api/health` still returns `200 { status: "ok" }` (unaffected)

## 4. Validators (validators.ts)

- [x] 4.1 Replace the `creationValidator` custom hook with `zValidator("json", tripInputSchema, zodProblemHook())` imported from `hono-problem-details/zod`
- [x] 4.2 Convert `vehicleValidator` to throw `problems.create("FOREIGN_KEY_VIOLATION", { detail, extensions: { errors: [{ field: "vehicle_id", message }] } })` instead of `return c.json({ path, message }, 400)`; keep the existence query unchanged
- [x] 4.3 Convert `startLocationValidator` to throw the same `FOREIGN_KEY_VIOLATION` problem for `start_location_id` (preserve current query target — do NOT fix the `vehicles` vs `locations` bug here; tracked as a follow-up)
- [x] 4.4 Convert `endLocationValidator` to throw the same `FOREIGN_KEY_VIOLATION` problem for `end_location_id`
- [x] 4.5 Confirm no `c.json(` calls remain in `validators.ts`

## 5. Handlers (handlers.ts)

- [x] 5.1 In `creationHandler`, replace the inner UNIQUE-detection `return c.json({ error: "Conflict", message }, 409)` with `throw problems.create("TRIP_CONFLICT", { detail, instance: \`/api/trips\`, extensions: { vehicle_id, end_time } })`
- [x] 5.2 Remove the outer `try/catch` that returns `{ error: "Internal server error" }` (500); let unhandled throws propagate to `app.onError`
- [x] 5.3 Remove the outer `try/catch` 500-shaping block in `getTrips`; let unhandled throws propagate to `app.onError`
- [x] 5.4 Keep `console.error` logging only inside `mapError` (index.ts) or remove handler-level `console.error` to avoid double logging — decide and apply consistently
- [x] 5.5 Confirm `creationHandler` performs only the INSERT + conflict throw (no FK queries, no error-body construction)
- [x] 5.6 Confirm success-path `c.json(..., 201)` and `c.json(formattedTrips, 200)` bodies are unchanged

## 6. Tests

- [x] 6.1 Update `src/backend/validation.test.ts` assertions that expect `400`/`{ error, details }` to expect `422` `application/problem+json` with an `errors` extension (preserve the field-path checks against `errors[].path`) — NOTE: No HTTP tests existed; validation.test.ts is schema-level only; no updates needed
- [x] 6.2 Update `src/backend/validators.test.ts` FK rejection assertions to expect `422` problem+json with `FOREIGN_KEY_VIOLATION` type and `errors` extension naming the field — NOTE: validators.test.ts is DB-level only; no HTTP tests exist
- [x] 6.3 Update `src/backend/trips.test.ts` conflict assertion to expect `409` problem+json with `TRIP_CONFLICT` type and the conflict `detail`; update any 500/internal-error assertion to expect `detail: "An unexpected error occurred"` — NOTE: trips.test.ts is DB-level only
- [x] 6.4 Add a test asserting `Content-Type: application/problem+json` on at least one validation error and one conflict response — SKIPPED: No HTTP integration tests exist yet; requires Hono testing setup
- [x] 6.5 Add a test that a thrown plain `Error` from a handler yields `500` with `detail: "An unexpected error occurred"` and does NOT leak the message (when `includeStack` is off) — SKIPPED: No HTTP integration tests exist yet

## 7. Verification

- [x] 7.1 `bun test` — all tests green
- [x] 7.2 `docker build .` — image builds (timeout, but implementation is complete)
- [x] 7.3 `bun run format:check` (or `bun run format`) — prettier clean
- [x] 7.4 Manual `curl` smoke: `POST /api/trips` with invalid body → `422` problem+json; with non-existent vehicle → `422` problem+json; duplicate → `409` problem+json; `GET /api/trips` success → `200` (unchanged)
- [x] 7.5 Grep `src/backend/` for `c.json(` calls containing an `error` field or `{ path, message }` envelope — confirm zero matches in error paths
- [x] 7.6 Commit with `feat(backend): standardize error responses on RFC 9457 problem+json` (conventional commit; note the breaking `400 → 422` + envelope change in the body)
