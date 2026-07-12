## 1. Dependencies (human-review item)

- [ ] 1.1 Add `zod` and `@hono/zod-validator` to `package.json` via `bun install zod @hono/zod-validator`
- [ ] 1.2 Confirm both resolve under Bun (`bun -e "import('zod'); import('@hono/zod-validator')"` exits cleanly)

## 2. Schema module

- [ ] 2.1 Create `src/backend/schemas.ts` exporting `tripInputSchema` with required fields (`vehicle_id` string, `start_time`/`end_time` `z.string().datetime()`, `daypart` `z.enum(["morning","afternoon"])`, `duration_min` `z.number().int()`, `distance_km` `z.number().positive()`)
- [ ] 2.2 Add optional fields to the schema: `start_location_id`/`end_location_id` string, `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` number, `weather_start`/`weather_end` `z.record(z.unknown())` optional
- [ ] 2.3 Export a `zodErrorToValidationErrors(error: ZodError): ValidationError[]` helper joining nested paths with `.`

## 3. Type derivation

- [ ] 3.1 In `src/backend/types.ts`, replace the hand-written `TripInput` interface with `export type TripInput = z.infer<typeof tripInputSchema>` (import schema from `./schemas`)
- [ ] 3.2 Keep `ValidationError` and `Trip` interfaces unchanged; verify no other files import the old `TripInput` shape fields that diverge

## 4. Route wiring

- [ ] 4.1 In `src/backend/index.ts`, import `zValidator` and `tripInputSchema`; attach `zValidator('json', tripInputSchema, (result, c) => …)` to `POST /api/trips`
- [ ] 4.2 Implement the error hook to return `c.json({ error: "Validation failed", details: zodErrorToValidationErrors(result.error) }, 400)` on failure
- [ ] 4.3 Refactor `createTrip` in `src/backend/handlers.ts` to read `c.req.valid('json')` (typed `TripInput`) instead of calling `validateTripInput`; remove the `validation.valid` branch

## 5. Async FK checks

- [ ] 5.1 In `createTrip`, after reading the typed body, run the existing `SELECT id FROM vehicles WHERE id = ${vehicle_id}` check; on miss push `{ field: "vehicle_id", message: "vehicle does not exist" }` and return the `400` envelope
- [ ] 5.2 Run the `start_location_id` / `end_location_id` existence checks when provided, returning the existing messages (`start_location does not exist` / `end_location does not exist`) in the same `400` envelope
- [ ] 5.3 Preserve the existing 409 (duplicate key) and 500 error paths unchanged

## 6. Cleanup

- [ ] 6.1 Delete `src/backend/validation.ts`
- [ ] 6.2 Grep `src/backend/` for `validateTripInput` and `./validation` imports; confirm zero matches

## 7. Tests

- [ ] 7.1 Rewrite `src/backend/validation.test.ts` to target `tripInputSchema.safeParse` for pure rules (required, enum, integer, positive, datetime) and `zodErrorToValidationErrors` mapping
- [ ] 7.2 Update `src/backend/trips.test.ts`: keep happy-path 201, 409 conflict, and 500 cases; adjust malformed-body expectations to the staged behavior (Zod 400 before FK checks)
- [ ] 7.3 Add a test asserting multiple field errors return together in `details`
- [ ] 7.4 Add a test asserting non-existent `vehicle_id` returns 400 with `vehicle does not exist`

## 8. Verification

- [ ] 8.1 Run `bun test` — all tests green
- [ ] 8.2 Run `docker build .` — image builds successfully
- [ ] 8.3 Run `bun run format:check` — no formatting drift
- [ ] 8.4 Manual smoke: `POST /api/trips` with a valid body returns 201; with a missing field returns 400 with the expected envelope
