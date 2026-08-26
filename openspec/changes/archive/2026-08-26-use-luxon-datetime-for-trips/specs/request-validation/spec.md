## MODIFIED Requirements

### Requirement: Field types and constraints enforced

The schema SHALL enforce: `vehicle_id` as a 16-character nanoid-format string, `start_time`/`end_time` as ISO 8601 datetimes with offset (`z.iso.datetime({ offset: true })`) transformed to UTC Luxon `DateTime` via `DateTime.fromISO(s, { setZone: true }).toUTC()`, `daypart` enum `["morning","afternoon"]`, `duration_min` integer, `distance_km` positive number, `start_location_id`/`end_location_id` as optional 16-character nanoid-format strings, and optional `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` numbers. The transform SHALL run inside `zValidator` so that `c.req.valid('json')` yields the transformed `DateTime` values.

#### Scenario: Valid ISO datetime with offset transforms to UTC DateTime

- **GIVEN** a `POST /api/trips` body with `start_time: "2026-08-25T14:30:00+02:00"`
- **WHEN** the `zValidator` middleware runs the schema
- **THEN** `c.req.valid('json').start_time` SHALL be a Luxon `DateTime` with zone `UTC` representing `2026-08-25T12:30:00.000Z`

#### Scenario: Invalid daypart enum

- **GIVEN** a body with `daypart: "evening"`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `daypart` stating it must be `'morning'` or `'afternoon'`

#### Scenario: Non-positive distance rejected

- **GIVEN** a body with `distance_km: 0` (or negative)
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `distance_km` stating it must be greater than 0

#### Scenario: Non-ISO timestamp rejected

- **GIVEN** a body with `start_time: "yesterday"`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `start_time` stating it must be a valid ISO 8601 timestamp

#### Scenario: UUID-shaped vehicle_id rejected

- **GIVEN** a body with `vehicle_id` set to a 36-character UUID string (e.g. `550e8400-e29b-41d4-a716-446655440000`)
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `vehicle_id` stating it must be a 16-character nanoid

#### Scenario: Malformed nanoid rejected

- **GIVEN** a body with `vehicle_id` set to a 16-character string containing characters outside the nanoid alphabet (e.g. containing spaces)
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `vehicle_id` stating it must be a 16-character nanoid

### Requirement: Async foreign-key and uniqueness checks in a single validation middleware

The system SHALL verify that `vehicle_id` (always) and `start_location_id`/`end_location_id` (when provided) reference existing rows, plus the `(vehicle_id, end_time)` uniqueness pre-check, plus the odometer monotonicity check, in a SINGLE async Hono middleware that runs AFTER `zValidator` and BEFORE `creationHandler`. The middleware SHALL read the validated input via `c.req.valid("json")` (the transformed `DateTime`-bearing value), NOT via the `req` parameter of `validator("json")` (which re-parses the body and overwrites the transform). On a missing reference, the middleware SHALL `throw` a `FOREIGN_KEY_VIOLATION` problem with status `422`. On a duplicate `(vehicle_id, end_time)`, the middleware SHALL `throw` a `TRIP_CONFLICT` problem with status `409`. On an odometer reading lower than the previous reading, the middleware SHALL `throw` a `FOREIGN_KEY_VIOLATION` problem with status `422`. The legacy five-middlewares chain (`vehicleValidator`, `startLocationValidator`, `endLocationValidator`, `tripConflictValidator`, plus the implicit odometer check) SHALL be collapsed into this one middleware.

#### Scenario: Non-existent vehicle rejected

- **GIVEN** a structurally valid body whose `vehicle_id` does not exist in the `vehicles` table
- **WHEN** the single validation middleware runs
- **THEN** the system SHALL respond `422` `application/problem+json` whose `errors` extension identifies `vehicle_id` and whose `detail` indicates the vehicle does not exist

#### Scenario: Pre-existing duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another `POST /api/trips` request is received with the same `vehicle_id` X and `end_time` T
- **THEN** the middleware SHALL respond `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI and `creationHandler` SHALL NOT execute

#### Scenario: Middleware reads transformed DateTime, not raw body

- **GIVEN** a `POST /api/trips` body with `start_time: "2026-08-25T14:30:00+02:00"` has passed `zValidator`
- **WHEN** the single validation middleware runs
- **THEN** it SHALL read `c.req.valid("json").start_time` as a Luxon `DateTime` (zone `UTC`), and SHALL NOT read the raw `validator("json")` `req` parameter (which yields a string and overwrites the transform)

#### Scenario: Handler contains no FK, conflict, or odometer logic

- **GIVEN** the codebase after migration
- **WHEN** inspecting `creationHandler` in `src/backend/handlers.ts`
- **THEN** it SHALL perform only the INSERT and the `201` response shaping

### Requirement: TripInput type derived from schema output

The `TripInput` TypeScript type SHALL be derived as `z.output<typeof tripInputSchema>` in `src/backend/types.ts`, yielding `start_time`/`end_time` as Luxon `DateTime` (zone `UTC`). A new `TripInputRaw` type SHALL be derived as `z.input<typeof tripInputSchema>`, naming the string-shaped input. The legacy `Trip` interface extending `TripInput` with string `tracking_created`/`tracking_updated` SHALL be removed (it was dead code — never imported).

#### Scenario: Handler receives typed DateTime input

- **GIVEN** the `zValidator` middleware has validated and transformed a request body
- **WHEN** `createTrip` reads `c.req.valid('json')`
- **THEN** the value SHALL be statically typed as `TripInput` with `start_time: DateTime` and `end_time: DateTime`, with no manual casts in handler code

#### Scenario: Form handler returns TripInputRaw

- **GIVEN** `parseFormTripInput` has assembled the offset-bearing ISO strings
- **WHEN** its return type is inspected
- **THEN** it SHALL be `TripInputRaw` (string fields), which `tripInputSchema.parse()` then converts to `TripInput` (DateTime fields)

#### Scenario: Legacy Trip interface removed

- **GIVEN** the codebase after migration
- **WHEN** searching `src/backend/types.ts` for `export interface Trip`
- **THEN** zero matches SHALL exist
