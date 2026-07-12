## Context

`juice-journal` exposes two routes — `POST /api/trips` and `GET /api/trips`. Error handling is ad-hoc: each handler/validator calls `c.json({ error, ... }, status)` directly, `Content-Type` is `application/json`, and there is no `app.onError`. Current error shapes:

| Path | Status | Body |
|------|--------|------|
| Zod body validation fail | `400` | `{ error: "Validation failed", details: <zod issues> }` |
| FK existence check fail | `400` | `{ path: [...], message: "..." }` |
| UNIQUE constraint conflict | `409` | `{ error: "Conflict", message: "..." }` |
| Unhandled error | `500` | `{ error: "Internal server error" }` |

Stack: Hono `4.12.29`, `@hono/zod-validator` `0.8.0`, zod `4.4.3`, Bun runtime. The chosen library `hono-problem-details` requires Hono `>= 4.12.14` (satisfied) and integrates with `@hono/zod-validator` via a `zodProblemHook`. No external API consumers exist (personal project), so the response envelope is freely breakable; only the test suite must follow.

## Goals / Non-Goals

**Goals:**
- One error-response contract for every failure path: RFC 9457 `application/problem+json` with `{ type, status, title, detail, instance }` plus extension members.
- Single `app.onError(problemDetailsHandler(...))` registration owns the response shape; handlers/validators throw, they do not shape error bodies.
- Validation failures report field-level errors via a problem+json `errors` extension, status `422`.
- 500 responses never leak `error.message`/stack to the client (constant `detail`); stack surfaced only via `includeStack` outside production.
- Preserve existing success status codes (`201`, `200`) and the `409` conflict status.

**Non-Goals:**
- OpenAPI / `@hono/zod-openapi` integration (no OpenAPI spec exists yet; can be added later via `hono-problem-details/openapi`).
- OpenTelemetry trace injection (`otelApi` option) — not wired in this project.
- Localization (`localize` callback) — single-locale app.
- Changing the trip data model, DB schema, or any success-response shape.
- Migrating `GET /api/health` (it cannot fail meaningfully).

## Decisions

### Decision 1: `hono-problem-details` over a hand-rolled `app.onError`

Use the library's `problemDetailsHandler()` as the sole `app.onError` implementation rather than writing a custom handler.

- **Why**: RFC 9457 compliance (correct `Content-Type`, standard fields, extension flattening), Zod hook, type-safe `problemDetails()` throw helper, and a problem-type registry — all battle-tested. A hand-rolled handler would re-implement the same flattening/status-title rules and drift from the RFC.
- **Alternative**: Custom `app.onError((err, c) => c.json({...}, 500))` — rejected; reinvents the contract and the Zod-error mapping, and loses the registry/type-safety.

### Decision 2: Handler options — `autoInstance`, `includeStack`, `defaultType`, no `typePrefix`

Configure `problemDetailsHandler({ autoInstance: true, includeStack: process.env.NODE_ENV !== "production", defaultType: "about:blank" })`.

- **Why**: `autoInstance` populates `instance` from `c.req.path` for free (useful for retry/dedup on the client). `includeStack` aids local/dev debugging without leaking in prod. `about:blank` is the RFC-correct default when the HTTP status alone suffices.
- **Alternative**: Set `typePrefix: "https://juice-journal.local/problems"` — rejected for now; no public host/URI scheme exists. Domain-specific types (e.g. the UNIQUE conflict) carry an explicit full `type` URI via the registry instead.

### Decision 3: Problem type registry for domain errors

Define a `createProblemTypeRegistry` in `src/backend/problems.ts` (new file) for domain errors that recur: at minimum `TRIP_CONFLICT` (`409`, type `https://juice-journal.local/problems/trip-conflict`) and `FOREIGN_KEY_VIOLATION` (`422`, type `.../foreign-key-violation`).

- **Why**: Single source of truth for `type`/`status`/`title` of errors thrown from more than one place; the FK validators and the UNIQUE catch both become one-line `problems.create(...)` calls. Keeps handlers free of string literals.
- **Alternative**: Call `problemDetails({...})` inline at each throw site — rejected; duplicates the type URI/status/title across handlers and validators.

### Decision 4: Validation via `zodProblemHook()`; FK validators throw

Replace the `creationValidator`'s custom hook with `zValidator("json", tripInputSchema, zodProblemHook())` (from `hono-problem-details/zod`), yielding `422` problem+json with an `errors` extension (`[{ field, message, code }]`). Convert the three async FK validators (`vehicleValidator`, `startLocationValidator`, `endLocationValidator`) from `return c.json({...}, 400)` to `throw problems.create("FOREIGN_KEY_VIOLATION", { detail, instance, extensions: { field, ... } })`.

- **Why**: Threading FK failures through `app.onError` gives them the same problem+json shape as every other error, instead of a one-off `{ path, message }` body. Validation status moves `400 → 422` (RFC 9457 convention for semantic validation failures; `400` remains valid for malformed JSON, which Hono surfaces separately).
- **Alternative**: Keep FK checks returning `400` problem+json directly — rejected; bypasses the global handler and re-introduces per-validator response shaping.
- **Note**: The FK validators currently query `vehicles` for location IDs (likely a copy-paste bug: `SELECT id FROM vehicles WHERE id = ${start_location_id}`). This change does NOT fix that query target (out of scope; tracked separately) — it only changes the failure response shape.

### Decision 5: Handlers throw; remove 500-shaping try/catch

In `src/backend/handlers.ts`, remove the outer `try/catch` blocks whose only purpose is to return `{ error: "Internal server error" }` (500). Let unhandled throws propagate to `app.onError`, which emits the generic 500 problem+json (constant `detail = "An unexpected error occurred"`). Keep the inner UNIQUE-detection catch and convert it to `throw problems.create("TRIP_CONFLICT", {...})`. Keep `console.error` logging by moving it into a `mapError` callback OR drop it in favor of the handler's own behavior — decision: keep `console.error` via a thin `mapError` that logs and returns `undefined` (fall through to defaults).

- **Why**: Eliminates duplicated 500 boilerplate; centralizes logging; guarantees the 500 body never leaks `error.message` (the library enforces the constant `detail`).
- **Alternative**: Keep per-handler try/catch and `throw new HTTPException(500, ...)` — rejected; still duplicates the catch wrapper and loses the library's guaranteed-safe 500 body.

### Decision 6: Dependency addition is a human-review item

`AGENTS.md` auto-approves only Hono, HTMX, Pico CSS, Chart.js, and Bun stdlib. `hono-problem-details` is a new dependency and MUST be acknowledged before `bun install`. It has zero runtime deps (only the `hono` peer dep already present), so it adds no transitive surface.

## Risks / Trade-offs

- **[Breaking response shape & `400 → 422`]** → No external clients exist; only tests assert the old shape. Tests updated in the same change. Document the break in the commit body.
- **[FK validator query bug masked, not fixed]** → The `start_location_id`/`end_location_id` checks query `vehicles` not `locations`. This change preserves existing behavior (only reshapes the error). A separate change should fix the query target. Noted as an open question.
- **[Library abandonment]** → `hono-problem-details` is a small, zero-dep module; if it stalls, the contract (RFC 9457) is stable and a custom handler can replace it without changing response shapes. Low risk.
- **[Stack leakage if `includeStack` misconfigured]** → Gated on `NODE_ENV !== "production"`; default `NODE_ENV` for `bun serve`/`dev` is unset (treated as non-production → stacks shown). Acceptable for a local-only app; revisit before any public deploy.
- **[Validation status `422` vs Hono's malformed-JSON `400`]** → Malformed/non-JSON bodies are rejected by Hono before `zValidator` and remain `400`; only schema/semantic failures become `422`. This matches RFC intent.

## Migration Plan

1. Add dependency: `bun install hono-problem-details` (after human ack).
2. Create `src/backend/problems.ts` with the registry.
3. Wire `app.onError(problemDetailsHandler({...}))` in `src/backend/index.ts`.
4. Switch `creationValidator` to `zodProblemHook()`; convert FK validators to throw.
5. Simplify `handlers.ts` (throw on conflict; drop 500-shaping try/catch).
6. Update tests to assert problem+json shape + `422`/`409`/`500`.
7. Verify: `bun test`, `docker build .`, manual `curl` of each error path.

**Rollback**: Pure code revert — `git revert` the change commit and `bun install` to restore the lockfile. No DB or data changes are involved, so no data migration or cleanup is needed.

## Open Questions

- Should the FK validator query bug (`vehicles` table used for location checks) be fixed in this change or a follow-up? Proposed: follow-up, to keep this change focused on the error contract.
- Should a `typePrefix`/canonical problem URI host be reserved now for future public deployment? Proposed: no, until a host exists.
