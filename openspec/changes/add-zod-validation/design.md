## Context

`src/backend/validation.ts` currently hand-validates `TripInput` for `POST /api/trips`: object check, required-field loops, per-field type guards, daypart enum, ISO-date parsing, and async DB FK existence checks for `vehicle_id` / `start_location_id` / `end_location_id`. The handler (`createTrip`) calls `validateTripInput(body)`, branches on `valid`, then INSERTs. Shape is duplicated between `types.ts` (`TripInput` interface) and the validation function. There is no reusable validation layer for future endpoints. Tech stack: Bun + Hono 4.12 + PostgreSQL (`postgres` driver) + Bun tests. AGENTS.md requires human review for new dependencies and forbids client-side frameworks/custom CSS (not relevant here).

## Goals / Non-Goals

**Goals:**
- Single declarative source of truth for `POST /api/trips` request shape via a Zod schema.
- Typed handler input derived from the schema (`z.infer`), eliminating manual casts.
- Return a `400` JSON response on validation failure carrying error details — the envelope does NOT need to match the legacy `ValidationError[]` contract (there are no external callers); tests are updated to the new shape.
- Move async FK existence checks (vehicle/location) out of the handler into a dedicated validation step, since they cannot live in a pure Zod schema.
- Maintain existing 201/409/500 status-code behavior on the happy/conflict/error paths.

**Non-Goals:**
- Validating query params, headers, or response bodies (only the JSON request body of `POST /api/trips`).
- Validating `GET /api/trips` (no request body).
- Auto-generating OpenAPI docs from schemas.
- Changing the trip data structure or DB schema.
- Migrating other endpoints (none exist yet).

## Decisions

### Decision 1: Use `@hono/zod-validator` middleware (`zValidator`)
Adopt `zValidator('json', schema, hook)` on the route rather than calling validation inside the handler.

- **Why**: Idiomatic Hono integration; middleware runs before the handler, parses + validates, and feeds the handler a typed `c.req.valid('json')`. The `hook` callback produces a `400` response with error details on failure.
- **Alternative considered**: Hono's built-in `validator('json', fn)` with `schema.safeParse()` — avoids one dependency (`@hono/zod-validator`) but requires manually handling `ZodError` in every route. Rejected: less ergonomic and less consistent across future endpoints. (User confirmed `@hono/zod-validator`.)

### Decision 2: Schemas co-located in `src/backend/types.ts`
Define `tripInputSchema` in the existing `types.ts` (no new `schemas.ts`).

- **Why**: The schema is the source of truth for the `TripInput` type (`z.infer<typeof tripInputSchema>`); keeping them together avoids a separate file and an extra import hop. Keeps `index.ts` focused on routing.
- **Alternative**: A dedicated `src/backend/schemas.ts` — rejected; unnecessary indirection for a single schema. (Original proposal named `schemas.ts`; the user revised it to `types.ts`.)

### Decision 3: FK checks live in a dedicated validation step, NOT in the handler
Zod handles shape/type/enum/range/ISO-date (synchronous). DB FK existence checks move to `src/backend/validators.ts` as an async Hono middleware that runs AFTER `zValidator` and BEFORE `createTrip`, reading `c.req.valid('json')`.

- **Why**: Zod schemas are synchronous and cannot query Postgres. Moving FK checks into their own middleware keeps `createTrip` focused on insertion and makes the validation pipeline explicit: `zValidator` → `fkCheckMiddleware` → handler. The user explicitly required FK checks NOT to live in the handler.
- **Alternative considered**: Inline FK checks in `createTrip` — rejected per the user's revision; couples handler to DB-existence logic and hides the validation step. A custom Zod `.refine(async ...)` — rejected; async refinements complicate `safeParse` and couple validation to the DB layer.

### Decision 4: Error envelope is NOT bound to the legacy contract
The `zValidator` hook returns `c.json({ error: "Validation failed", details: result.error.issues }, 400)` (Zod issue objects: `{ path, message, code, ... }`). The FK middleware returns `c.json({ error: "Validation failed", details: [{ field, message }] }, 400)` for its failures. The legacy `ValidationError` interface is removed from `types.ts`.

- **Why**: There are no external callers depending on the old `{ field, message }[]` shape, so the envelope is free to carry richer Zod-native detail. Tests are updated to assert `400` + presence of error details rather than the exact legacy shape.
- **Alternative considered**: Preserve the exact legacy envelope by mapping `ZodError` → `{ field, message }[]` — rejected as unnecessary coupling now that the contract is unconstrained.

### Decision 5: Schema field rules mirror current `validation.ts`
- `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km` — required.
- `daypart` → `z.enum(["morning", "afternoon"])`.
- `duration_min` → `z.number().int()`.
- `distance_km` → `z.number().positive()`.
- `start_time`/`end_time` → `z.string().datetime()` (ISO 8601, supersedes the manual `new Date(...).toISOString()` try/catch).
- Optionals (`start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`) → optional with appropriate primitives; `weather_start`/`weather_end` as `z.record(z.unknown())`.

## Risks / Trade-offs

- **[New dependency]** Adding `zod` + `@hono/zod-validator` is a human-review item per AGENTS.md. → Mitigation: surface explicitly in proposal/PR; pin versions; both are widely used, tree-shakeable, and Bun-compatible.
- **[`z.string().datetime()` stricter than current parser]** Current code accepts anything `new Date(x)` can parse (incl. some non-ISO strings). `z.string().datetime()` enforces strict ISO 8601. → Mitigation: acceptable tightening; aligns with the documented "ISO 8601 timestamp" intent. Document in tasks/tests.
- **[Behavior change: Zod rejects before FK checks]** Previously malformed-and-missing-FK inputs could accumulate both classes of errors in one response. Now malformed input returns `400` first; FK errors surface only on otherwise-valid payloads via the FK middleware. → Mitigation: acceptable; tests updated to reflect the staged pipeline.
- **[Error envelope change]** The `400` details shape differs from the legacy `{ field, message }[]` contract. → Mitigation: no external callers exist; tests are the only consumer and are updated.
- **[FK logic in its own file]** Adds `src/backend/validators.ts`. → Mitigation: minimal new surface; keeps the handler clean per the user's explicit instruction.
- **[`TripInput` type relocation]** Deriving the type from the schema changes where the type lives. → Mitigation: re-exported from `types.ts` so import sites are unaffected.

## Migration Plan

1. Add `zod` and `@hono/zod-validator` via `bun install` (after human approval).
2. Add `tripInputSchema` to `src/backend/types.ts`; derive `TripInput` via `z.infer`; remove the `ValidationError` interface (keep `Trip`).
3. Create `src/backend/validators.ts` exporting `fkCheckMiddleware`, which reads `c.req.valid('json')`, runs the existing `SELECT id FROM vehicles/locations WHERE id = ...` queries, and returns `400` on failure.
4. In `src/backend/index.ts`, chain `zValidator('json', tripInputSchema, hook)` → `fkCheckMiddleware` → `createTrip` on `POST /api/trips`.
5. Refactor `createTrip` in `src/backend/handlers.ts` to read `c.req.valid('json')` (typed `TripInput`) and perform only the INSERT (plus 409/500 handling); remove all FK logic and the `validateTripInput` call.
6. Delete `src/backend/validation.ts`.
7. Update `validation.test.ts` to target `tripInputSchema.safeParse` (pure rules); add `validators.test.ts` for FK checks; update `trips.test.ts` for the staged pipeline and new envelope.
8. Run `bun test`; verify `docker build .` still succeeds.

**Rollback**: `git revert` the feature-branch commit + `bun install`. No DB migration exists, so no data rollback is needed.

## Open Questions

- None outstanding. (Schema location, FK-check placement, and envelope policy are decided above.)
