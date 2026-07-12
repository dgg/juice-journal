## MODIFIED Requirements

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

The schema SHALL enforce: `vehicle_id` string, `start_time`/`end_time` as ISO 8601 datetimes (`z.string().datetime()`), `daypart` enum `["morning","afternoon"]`, `duration_min` integer, `distance_km` positive number, and optional `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` numbers and `weather_start`/`weather_end` objects.

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

#### Scenario: Handler contains no FK logic

- **GIVEN** the codebase after migration
- **WHEN** inspecting `creationHandler` in `src/backend/handlers.ts`
- **THEN** it SHALL perform only the INSERT and conflict handling, with no vehicle/location existence queries and no error-body construction
