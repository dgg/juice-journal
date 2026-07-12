# Request Validation Specification

## Purpose

Defines the validation layer for `POST /api/trips` requests, including Zod schema-based body validation, async foreign-key checks, and the migration path from legacy validation to a single-source-of-truth schema.

## Requirements

### Requirement: Request body validated by Zod schema

The system SHALL validate the JSON body of `POST /api/trips` against a Zod schema (`tripInputSchema`) defined in `src/backend/types.ts`, via the `@hono/zod-validator` `zValidator` middleware, before the route handler executes.

#### Scenario: Valid trip body is accepted

- **GIVEN** a `POST /api/trips` request with a JSON body containing all required fields (`vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`) of correct types and valid optional fields
- **WHEN** the request reaches the `zValidator` middleware
- **THEN** the body SHALL be parsed into a typed value accessible via `c.req.valid('json')` and the handler SHALL proceed to insert the trip

#### Scenario: Non-object body is rejected

- **GIVEN** a `POST /api/trips` request whose body is a JSON primitive (e.g. a string or number) or empty
- **WHEN** the `zValidator` middleware runs
- **THEN** the system SHALL respond `400` with a JSON body of `{ "error": "Validation failed", "details": [...] }` (the `details` array need not match the legacy `ValidationError[]` shape) and the handler SHALL NOT execute

### Requirement: Required fields enforced

The `tripInputSchema` SHALL mark `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km` as required.

#### Scenario: Missing required field

- **GIVEN** a `POST /api/trips` body that omits `duration_min`
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry whose path references `duration_min` and whose message indicates it is required

### Requirement: Field types and constraints enforced

The schema SHALL enforce: `vehicle_id` string, `start_time`/`end_time` as ISO 8601 datetimes (`z.string().datetime()`), `daypart` enum `["morning","afternoon"]`, `duration_min` integer, `distance_km` positive number, and optional `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` numbers and `weather_start`/`weather_end` objects.

#### Scenario: Invalid daypart enum

- **GIVEN** a body with `daypart: "evening"`
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `daypart` stating it must be `'morning'` or `'afternoon'`

#### Scenario: Non-positive distance rejected

- **GIVEN** a body with `distance_km: 0` (or negative)
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `distance_km` stating it must be greater than 0

#### Scenario: Non-ISO timestamp rejected

- **GIVEN** a body with `start_time: "yesterday"`
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `start_time` stating it must be a valid ISO 8601 timestamp

### Requirement: Validation error response

The `zValidator` error hook SHALL return `c.json({ error: "Validation failed", details: result.error.issues }, 400)`, surfacing Zod's native issue objects. The response is NOT required to match the legacy `ValidationError[]` contract; tests SHALL be updated to assert `400` plus the presence of relevant error details rather than the exact legacy shape.

#### Scenario: Multiple field errors returned together

- **GIVEN** a body missing `vehicle_id` and with an invalid `daypart`
- **WHEN** the schema is validated
- **THEN** the `400` response `details` array SHALL contain one entry per failing field

### Requirement: Async foreign-key checks in a dedicated validation step

The system SHALL verify that `vehicle_id` (always) and `start_location_id`/`end_location_id` (when provided) reference existing rows, performed by an async Hono middleware in `src/backend/validators.ts` that runs AFTER `zValidator` and BEFORE `createTrip`. This step SHALL NOT be implemented inside `createTrip`. Failures SHALL return `c.json({ error: "Validation failed", details: [{ field, message }] }, 400)`.

#### Scenario: Non-existent vehicle rejected

- **GIVEN** a structurally valid body whose `vehicle_id` does not exist in the `vehicles` table
- **WHEN** the FK-check middleware runs
- **THEN** the system SHALL respond `400` whose `details` include `{ field: "vehicle_id", message: "vehicle does not exist" }`

#### Scenario: Non-existent start_location rejected

- **GIVEN** a structurally valid body providing a `start_location_id` not present in `locations`
- **WHEN** the FK-check middleware runs
- **THEN** the system SHALL respond `400` whose `details` include `{ field: "start_location_id", message: "start_location does not exist" }`

#### Scenario: Handler contains no FK logic

- **GIVEN** the codebase after migration
- **WHEN** inspecting `createTrip` in `src/backend/handlers.ts`
- **THEN** it SHALL perform only the INSERT and 409/500 handling, with no vehicle/location existence queries

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
