## Context

`src/backend/validation.ts` currently hand-validates `TripInput` for `POST /api/trips`: object check, required-field loop, per-field type guards, daypart enum, ISO-date parsing, and async DB FK existence checks for `vehicle_id` / `start_location_id` / `end_location_id`. The handler (`createTrip`) calls `validateTripInput(body)`, branches on `valid`, then INSERTs. Shape is duplicated between `types.ts` (`TripInput` interface) and the validation function. There is no reusable validation layer for future endpoints. Tech stack: Bun + Hono 4.12 + PostgreSQL (`postgres` driver) + Bun tests. AGENTS.md requires human review for new dependencies and forbids client-side frameworks/custom CSS (not relevant here).

## Goals / Non-Goals

**Goals:**
- Single declarative source of truth for `POST /api/trips` request shape via a Zod schema.
- Typed handler input derived from the schema (`z.infer`), eliminating manual casts.
- Preserve the existing 400 error envelope `{ error: "Validation failed", details: ValidationError[] }` so callers/tests stay compatible.
- Keep async FK existence checks (vehicle/location) — these cannot live in a pure Zod schema.
- Maintain existing 201/409/500 behavior on the happy/conflict/error paths.

**Non-Goals:**
- Validating query params, headers, or response bodies (only the JSON request body of `POST /api/trips`).
- Validating `GET /api/trips` (no request body).
- Auto-generating OpenAPI docs from schemas.
- Changing the trip data structure or DB schema.
- Migrating other endpoints (none exist yet).

## Decisions

### Decision 1: Use `@hono/zod-validator` middleware (`zValidator`)
Adopt `zValidator('json', schema, hook)` on the route rather than calling validation inside the handler.

- **Why**: Idiomatic Hono integration; middleware runs before the handler, parses + validates, and feeds the handler a typed `c.req.valid('json')`. The `hook` callback lets us shape the 400 response into the existing `ValidationError[]` envelope.
- **Alternative considered**: Hono's built-in `validator('json', fn)` with `schema.safeParse()` — avoids one dependency (`@hono/zod-validator`) but requires manually mapping `ZodError` to the envelope in every route. Rejected: less ergonomic and less consistent across future endpoints. (User confirmed `@hono/zod-validator`.)

### Decision 2: Schema module in `src/backend/schemas.ts`
Co-locate Zod schemas in a new `schemas.ts` rather than inline in `index.ts`.

- **Why**: Reusable, unit-testable in isolation, and keeps `index.ts` focused on routing. `TripInput` type becomes `z.infer<typeof tripInputSchema>` in `types.ts`, removing the duplicated interface.
- **Alternative**: Inline schemas in route file — rejected; harder to test and reuse.

### Decision 3: Split pure (Zod) vs async (DB) validation
Zod handles shape/type/enum/range/ISO-date. DB FK existence checks stay as an explicit async step inside `createTrip` *after* the typed body is received, reusing the existing `db` queries.

- **Why**: Zod schemas are synchronous and cannot query Postgres. Keeping FK checks in the handler preserves their behavior (single combined error list is no longer required because Zod already rejected malformed input before this step; FK failures return the same `ValidationError[]` envelope via a helper).
- **Alternative**: A custom Zod `.refine(async ...)` — rejected; async refinements complicate `safeParse`, are easy to forget, and couple validation to the DB layer.

### Decision 4: Map `ZodError` → `ValidationError[]` in the `zValidator` hook
The hook transforms `error.issues` into `{ field, message }` pairs (joining nested paths with `.`) and returns `c.json({ error: "Validation failed", details }, 400)`.

- **Why**: Matches the current contract exactly; existing client/test expectations keep working.
- **Alternative**: Return Zod's raw `error.format()` — rejected; changes the public error shape (breaks tests/clients).

### Decision 5: Schema field rules mirror current `validation.ts`
- `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km` — required.
- `daypart` → `z.enum(["morning", "afternoon"])`.
- `duration_min` → `z.number().int()`.
- `distance_km` → `z.number().positive()`.
- `start_time`/`end_time` → `z.string().datetime()` (ISO 8601, supersedes the manual `new Date(...).toISOString()` try/catch).
- Optionals (`start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`) → optional with appropriate primitives/`.passthrough()` for the weather objects.

## Risks / Trade-offs

- **[New dependency]** Adding `zod` + `@hono/zod-validator` is a human-review item per AGENTS.md. → Mitigation: surface explicitly in proposal/PR; pin versions; both are widely used, tree-shakeable, and Bun-compatible.
- **[`z.string().datetime()` stricter than current parser]** Current code accepts anything `new Date(x)` can parse (incl. some non-ISO strings). `z.string().datetime()` enforces strict ISO 8601. → Mitigation: acceptable tightening; aligns with the documented "ISO 8601 timestamp" intent. Document in tasks/tests.
- **[Behavior change: Zod rejects before FK checks]** Previously malformed-and-missing-FK inputs could accumulate both classes of errors in one response. Now malformed input returns 400 first; FK errors surface only on otherwise-valid payloads. → Mitigation: acceptable; tests updated to reflect the staged behavior.
- **[`TripInput` type relocation]** Deriving the type from the schema changes where the type lives. → Mitigation: re-export from `types.ts` so import sites are unaffected.

## Migration Plan

1. Add `zod` and `@hono/zod-validator` via `bun install` (after human approval).
2. Create `src/backend/schemas.ts` with `tripInputSchema`.
3. Update `src/backend/types.ts` to derive `TripInput` via `z.infer` (keep `ValidationError`, `Trip`).
4. Add the `zValidator` middleware + error-shaping hook to `POST /api/trips` in `index.ts`; refactor `createTrip` to consume `c.req.valid('json')` and run FK checks directly.
5. Delete `src/backend/validation.ts`.
6. Update `validation.test.ts` to target `tripInputSchema` (pure) + FK helper; update `trips.test.ts` for the staged-error behavior.
7. Run `bun test`; verify `docker build .` still succeeds.

**Rollback**: `git revert` the feature-branch commit + `bun install`. No DB migration exists, so no data rollback is needed.

## Open Questions

- None outstanding. (FK check placement and middleware choice are decided above.)
