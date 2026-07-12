## Why

Error responses across the API are inconsistent and hand-rolled: `POST /api/trips` returns `{ error: "Validation failed", details: [...] }` (400), `{ path, message }` (400) from FK checks, `{ error: "Conflict", message }` (409), and `{ error: "Internal server error" }` (500). There is no `app.onError` handler, so every handler shapes its own error body and `Content-Type` is plain `application/json`. Adopting RFC 9457 Problem Details via `hono-problem-details` gives one contract — `application/problem+json` with `{ type, status, title, detail, instance }` plus extension members — that clients, tests, and (future) OpenAPI docs can all agree on, and removes per-handler error-shaping boilerplate.

## What Changes

- Add dependency `hono-problem-details` (peer dep `hono >= 4.12.14` satisfied by current `4.12.29`).
- Register `app.onError(problemDetailsHandler({ ... }))` in `src/backend/index.ts` as the single error-response path.
- Replace the custom `zValidator` failure hook in `src/backend/validators.ts` with `zodProblemHook()` from `hono-problem-details/zod` → `422` problem+json with an `errors` extension array.
- Convert the async FK existence validators (`vehicleValidator`, `startLocationValidator`, `endLocationValidator`) from early `c.json({ path, message }, 400)` returns to `throw problemDetails({ status: 422, ... })` so they flow through `app.onError`.
- **BREAKING**: Replace ad-hoc error envelopes in `src/backend/handlers.ts` (`{ error, message }`) with thrown `problemDetails` / `HTTPException`. The UNIQUE-constraint conflict becomes a `409` problem+json with a domain `type` URI; unhandled errors fall through to the generic `500` problem+json emitted by the handler (constant `detail`, never `error.message`).
- Remove manual `try/catch` error-shaping blocks that only re-wrap into `{ error: "Internal server error" }`; keep domain-specific catches (UNIQUE detection) and let the global handler own the 500 shape.
- Update tests asserting on `{ error, ... }` response bodies to assert the problem+json shape.
- Enable `includeStack` only outside production and `autoInstance: true`.

## Capabilities

### New Capabilities

- `error-handling`: Unified RFC 9457 Problem Details error contract for all API error responses (`application/problem+json`, single `app.onError` handler, problem type registry, validation/FK/conflict/500 mapping).

### Modified Capabilities

- `request-validation`: Validation failure responses change from a custom `400 { error, details }` envelope to a `422` problem+json body with an `errors` extension; FK existence checks throw problem details instead of returning a custom `400 { path, message }` body.
- `trips-api`: `POST /api/trips` conflict and internal-error responses change from `{ error, message }` envelopes to problem+json; status codes for conflict (`409`) and server error (`500`) are preserved.

## Impact

- **Dependencies**: Adds `hono-problem-details` (human-review item per `AGENTS.md` — only Hono/HTMX/Pico/Chart.js/Bun-stdlib are auto-approved).
- **Code**: `src/backend/index.ts`, `src/backend/validators.ts`, `src/backend/handlers.ts`.
- **API contract**: **BREAKING** for any consumer relying on the `{ error, ... }` envelope or `400` for validation. New shape is `application/problem+json`; validation moves `400 → 422`. No external clients exist today (personal project), so blast radius is test suite only.
- **Tests**: `src/backend/trips.test.ts`, `src/backend/validators.test.ts`, `src/backend/validation.test.ts` updated to new body shape and status codes.
- **Rollback**: Revert the dependency addition and the four source files; restore prior `c.json({ error, ... })` envelopes from git history. No DB schema or data migration is involved, so rollback is a pure code revert with no data risk.
