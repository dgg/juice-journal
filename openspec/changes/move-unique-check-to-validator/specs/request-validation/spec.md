## MODIFIED Requirements

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

## ADDED Requirements

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
