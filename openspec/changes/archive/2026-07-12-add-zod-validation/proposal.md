## Why

Trip input validation is hand-rolled in `src/backend/validation.ts` (206 lines of manual type checks, required-field loops, enum guards, and ISO-date parsing). It is verbose, hard to extend as new fields are added, and duplicates shape logic already encoded in `types.ts`. Replacing it with Zod schemas paired with Hono's validator middleware yields a single declarative source of truth for request shapes, automatic typed outputs, and consistent 400 error envelopes — while shrinking the validation surface.

## What Changes

- Add `zod` and `@hono/zod-validator` dependencies (requires human review per AGENTS.md dependency policy).
- Derive `TripInput` (and its optional fields) from the Zod schemas that will be created in the existing `src/backend/types.ts`, replacing the manual rules in `validation.ts`.
- Adopt Hono's `zValidator` middleware on `POST /api/trips` so request bodies are parsed, validated, and typed before the handler runs.
- Preserve the existing async FK checks (vehicle/location existence) that cannot be expressed purely in a Zod schema; run them after Zod parsing in a dedicated validation step (not in the handler, after the schema validation).
- No need to standardize the validation error response shape to match the current contract as there are no callers. Modify the tests accordingly.
- **BREAKING** (internal): `validateTripInput` is removed; handlers consume the Zod-parsed body directly. Maybe API contract change as validation errors may come in a different shape.
- Update `validation.test.ts` to assert behavior through the schema/validator rather than the deleted function.

## Capabilities

### New Capabilities

- `request-validation`: Declarative validation of API request bodies using Zod schemas and Hono validator middleware, producing typed inputs and consistent 400 error responses.

### Modified Capabilities

<!-- No existing specs in openspec/specs/; no requirement-level deltas to existing capabilities. -->

## Impact

- **Code**: `src/backend/validation.ts` (removed), `src/backend/handlers.ts` (consume typed body only — no FK logic), `src/backend/types.ts` (Zod `tripInputSchema` + `TripInput` via `z.infer`; `ValidationError` removed), `src/backend/validators.ts` (new — dedicated async FK validation step).
- **APIs**: `POST /api/trips` keeps the same 400/409/201 status codes; the 400 error envelope MAY differ in shape (no external callers).
- **Dependencies**: adds `zod` + `@hono/zod-validator` (human-review item per AGENTS.md).
- **Tests**: `src/backend/validation.test.ts` and `src/backend/trips.test.ts` updated to exercise the schema/validator.
- **Rollback plan**: Revert the commit; restore `validation.ts` from git history; remove `zod`/`@hono/zod-validator` from `package.json` via `bun install`. No DB migration is involved, so rollback is a single `git revert` with `bun install`.
