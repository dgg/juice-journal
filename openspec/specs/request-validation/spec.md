# Request Validation Specification

## Purpose

Defines the validation layer for `POST /api/trips` requests, including Zod schema-based body validation, async foreign-key checks, RFC 9457 Problem Details error responses, and the migration path from legacy validation to a single-source-of-truth schema.

## Requirements

### Requirement: Request body validated by Zod schema

The system SHALL validate the JSON body of `POST /api/trips` against a Zod schema (`tripInputSchema`) defined in `src/backend/types.ts`, via the `@hono/zod-validator` `zValidator` middleware using the `zodProblemHook()` from `hono-problem-details/zod`, before the route handler executes. Validation failures SHALL be reported as RFC 9457 Problem Details (per the `error-handling` capability) with status `422`.

#### Scenario: Valid trip body is accepted

- **GIVEN** a `POST /api/trips` request with a JSON body containing all required fields (`vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`) of correct types and valid optional fields
- **WHEN** the request reaches the `zValidator` middleware
- **THEN** the body SHALL be parsed into a typed value accessible via `c.req.valid('json')` and the handler SHALL proceed to insert the trip

#### Scenario: Non-object body is rejected

- **GIVEN** a `POST /api/trips` request whose body is a JSON primitive (e.g. a string or number) or empty
- **WHEN** the `zValidator` middleware runs
- **THEN** the system SHALL respond `422` with `Content-Type: application/problem+json` and a body containing `type`, `status: 422`, `title: "Validation Error"`, `detail: "Request validation failed"`, and an `errors` extension array of Zod issue objects, and the handler SHALL NOT execute

### Requirement: Required fields enforced

The `tripInputSchema` SHALL mark `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km` as required.

#### Scenario: Missing required field

- **GIVEN** a `POST /api/trips` body that omits `duration_min`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry whose `path` references `duration_min` and whose message indicates it is required

### Requirement: Field types and constraints enforced

The schema SHALL enforce: `vehicle_id` as a 16-character nanoid-format string, `start_time`/`end_time` as ISO 8601 datetimes (`z.iso.datetime()`), `daypart` enum `["morning","afternoon"]`, `duration_min` integer, `distance_km` positive number, `start_location_id`/`end_location_id` as optional 16-character nanoid-format strings, and optional `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` numbers.

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

### Requirement: Validation error response

The `zValidator` error hook SHALL be `zodProblemHook()` from `hono-problem-details/zod`, producing a `422` `application/problem+json` response with `title: "Validation Error"`, `detail: "Request validation failed"`, and an `errors` extension array surfacing Zod's native issue objects (flattened to the top level per RFC 9457 §3.1). The legacy `{ error: "Validation failed", details: [...] }` envelope SHALL no longer be produced. Tests SHALL be updated to assert `422`, `application/problem+json`, and the presence of relevant entries in the `errors` extension.

#### Scenario: Multiple field errors returned together

- **GIVEN** a body missing `vehicle_id` and with an invalid `daypart`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL contain one entry per failing field

### Requirement: Async foreign-key checks in a dedicated validation step

The system SHALL verify that `vehicle_id` (always) and `start_location_id`/`end_location_id` (when provided) reference existing rows, performed by an async Hono middleware in `src/backend/validators.ts` that runs AFTER `zValidator` and BEFORE `creationHandler`. This step SHALL NOT be implemented inside `creationHandler`. On a missing reference, the middleware SHALL `throw` a `FOREIGN_KEY_VIOLATION` problem (via the problem type registry) with status `422`, a `detail` naming the missing field, and an `errors`/`field` extension identifying the offending field, so that the response flows through `app.onError` as `application/problem+json`. The middleware SHALL NOT return a `c.json({ path, message }, 400)` body.

#### Scenario: Non-existent vehicle rejected

- **GIVEN** a structurally valid body whose `vehicle_id` does not exist in the `vehicles` table
- **WHEN** the FK-check middleware runs
- **THEN** the system SHALL respond `422` `application/problem+json` whose `errors` extension identifies `vehicle_id` and whose `detail` indicates the vehicle does not exist

#### Scenario: Non-existent start_location rejected

- **GIVEN** a structurally valid body providing a `start_location_id` not present in the referenced table
- **WHEN** the FK-check middleware runs
- **THEN** the system SHALL respond `422` `application/problem+json` whose `errors` extension identifies `start_location_id` and whose `detail` indicates the location does not exist

#### Scenario: Handler contains no FK or conflict logic

- **GIVEN** the codebase after migration
- **WHEN** inspecting `creationHandler` in `src/backend/handlers.ts`
- **THEN** it SHALL perform only the INSERT and the `201` response shaping, with no vehicle/location existence queries, no unique-conflict detection, no `try/catch` around the INSERT, and no error-body construction

### Requirement: Unique-existence pre-check in a dedicated validation step

The system SHALL reject a `POST /api/trips` request whose `(vehicle_id, end_time)` already matches an existing row in `trips`, performed by an async Hono middleware (`tripConflictValidator`) in `src/backend/validators.ts` that runs AFTER the foreign-key checks and BEFORE `creationHandler`. The middleware SHALL issue a `SELECT` against `trips` for a row with the request's `vehicle_id` and `end_time`; if a row is found it SHALL `throw` a `TRIP_CONFLICT` problem (via the problem type registry) with status `409`, a `detail` indicating a trip with this `vehicle_id` and `end_time` already exists, and an `extensions` object carrying `vehicle_id` and `end_time`, so the response flows through `app.onError` as `application/problem+json`. The middleware SHALL NOT be implemented inside `creationHandler`, and `creationHandler` SHALL NOT catch a database unique-constraint violation.

#### Scenario: Pre-existing duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another `POST /api/trips` request is received with the same `vehicle_id` X and `end_time` T
- **THEN** the `tripConflictValidator` middleware SHALL respond `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI, whose `detail` indicates a trip with this `vehicle_id` and `end_time` already exists, and whose `extensions` carries `vehicle_id` X and `end_time` T, and `creationHandler` SHALL NOT execute

#### Scenario: Non-duplicate trip passes the pre-check

- **GIVEN** no trip exists for `vehicle_id` X with `end_time` T
- **WHEN** a `POST /api/trips` request is received with `vehicle_id` X and `end_time` T
- **THEN** the `tripConflictValidator` middleware SHALL return the request value unchanged and the request SHALL proceed to `creationHandler`

#### Scenario: Pre-check runs after foreign-key validation

- **GIVEN** a `POST /api/trips` request whose `vehicle_id` does not exist in `vehicles`
- **WHEN** the validation chain executes
- **THEN** the foreign-key check SHALL reject the request with `422` before the unique-existence pre-check queries the `trips` table

#### Scenario: Race condition surfaces as unhandled error

- **GIVEN** no trip exists for `vehicle_id` X with `end_time` T at pre-check time
- **WHEN** a row with `vehicle_id` X and `end_time` T is inserted into `trips` between the `tripConflictValidator` `SELECT` and `creationHandler`'s `INSERT`
- **THEN** the database unique-constraint violation SHALL propagate uncaught to `app.onError` and the system SHALL respond `500` `application/problem+json` (per the `error-handling` capability), not `409`

### Requirement: TripInput type derived from schema

The `TripInput` TypeScript type SHALL be derived as `z.infer<typeof tripInputSchema>` in `src/backend/types.ts`, eliminating the hand-maintained interface and providing a single source of truth. The legacy `ValidationError` interface SHALL be removed.

#### Scenario: Handler receives typed input

- **GIVEN** the `zValidator` middleware has validated a request body
- **WHEN** `createTrip` reads `c.req.valid('json')`
- **THEN** the value SHALL be statically typed as `TripInput` with no manual casts in handler code

#### Scenario: Legacy ValidationError type removed

- **GIVEN** the codebase after migration
- **WHEN** searching `src/backend/types.ts` for `ValidationError`
- **THEN** zero matches SHALL exist

### Requirement: Legacy validation module removed

The system SHALL remove `src/backend/validation.ts` and its `validateTripInput` export; no route handler or middleware SHALL call `validateTripInput` after this change.

#### Scenario: No references to deleted validator

- **GIVEN** the codebase after migration
- **WHEN** searching for imports of `./validation` or calls to `validateTripInput`
- **THEN** zero matches SHALL exist in `src/backend/`
