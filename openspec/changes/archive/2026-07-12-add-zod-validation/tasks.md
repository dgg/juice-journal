## 1. Dependencies (human-review item)

- [x] 1.1 Add `zod` and `@hono/zod-validator` to `package.json` via `bun install zod @hono/zod-validator`
- [x] 1.2 Confirm both resolve under Bun (`bun -e "import('zod'); import('@hono/zod-validator')"` exits cleanly)

## 2. Schemas in types.ts

- [x] 2.1 In `src/backend/types.ts`, add `tripInputSchema` with required fields (`vehicle_id` string, `start_time`/`end_time` `z.string().datetime()`, `daypart` `z.enum(["morning","afternoon"])`, `duration_min` `z.number().int()`, `distance_km` `z.number().positive()`)
- [x] 2.2 Add optional fields to the schema: `start_location_id`/`end_location_id` string, `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` number, `weather_start`/`weather_end` `z.record(z.unknown())` optional

## 3. Type derivation

- [x] 3.1 In `src/backend/types.ts`, replace the hand-written `TripInput` interface with `export type TripInput = z.infer<typeof tripInputSchema>`
- [x] 3.2 Remove the `ValidationError` interface from `types.ts`; keep `Trip` unchanged
- [x] 3.3 Verify no other files import the removed `ValidationError` type

## 4. FK validation step (new module)

- [x] 4.1 Create `src/backend/validators.ts` exporting `fkCheckMiddleware` — an async Hono middleware that reads `c.req.valid('json')`
- [x] 4.2 Implement the `vehicle_id` existence check (`SELECT id FROM vehicles WHERE id = ${vehicle_id}`); on miss return `c.json({ error: "Validation failed", details: [{ field: "vehicle_id", message: "vehicle does not exist" }] }, 400)`
- [x] 4.3 Implement `start_location_id`/`end_location_id` existence checks (when provided), returning `start_location does not exist` / `end_location does not exist` in the same `400` envelope

## 5. Route wiring

- [x] 5.1 In `src/backend/index.ts`, import `zValidator` and `tripInputSchema`; chain `zValidator('json', tripInputSchema, hook)` → `fkCheckMiddleware` → `createTrip` on `POST /api/trips`
- [x] 5.2 Implement the `zValidator` hook to return `c.json({ error: "Validation failed", details: result.error.issues }, 400)` on failure (Zod-native issues; no mapping to the legacy shape)
- [x] 5.3 Refactor `createTrip` in `src/backend/handlers.ts` to read `c.req.valid('json')` (typed `TripInput`); perform ONLY the INSERT plus 409 (duplicate key) and 500 error paths — no FK logic, no `validateTripInput` call

## 6. Cleanup

- [x] 6.1 Delete `src/backend/validation.ts`
- [x] 6.2 Grep `src/backend/` for `validateTripInput`, `./validation`, and `ValidationError`; confirm zero matches

## 7. Tests

- [x] 7.1 Rewrite `src/backend/validation.test.ts` (or replace with `schemas.test.ts`) to target `tripInputSchema.safeParse` for pure rules (required, enum, integer, positive, datetime)
- [x] 7.2 Create `src/backend/validators.test.ts` for `fkCheckMiddleware` (non-existent vehicle, non-existent start/end location, valid FKs pass through)
- [x] 7.3 Update `src/backend/trips.test.ts`: keep happy-path 201, 409 conflict, and 500 cases; adjust malformed-body expectations to the staged pipeline (Zod `400` before FK checks) and the new `details` shape
- [x] 7.4 Add a test asserting multiple schema field errors return together in `details`
- [x] 7.5 Add a test asserting non-existent `vehicle_id` returns `400` with `vehicle does not exist` in `details`

## 8. Verification

- [x] 8.1 Run `bun test` — all tests green
- [x] 8.2 Run `docker build .` — image builds successfully
- [x] 8.3 Run `bun run format:check` — no formatting drift
- [x] 8.4 Manual smoke: `POST /api/trips` with a valid body returns 201; with a missing field returns 400 with error details
