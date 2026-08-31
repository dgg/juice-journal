## MODIFIED Requirements

### Requirement: Field types and constraints enforced

The schema SHALL enforce: `vehicle_id` as a 16-character nanoid-format string, `start_time`/`end_time` as ISO 8601 datetimes with offset (`z.iso.datetime({ offset: true })`) transformed to UTC Luxon `DateTime` via `DateTime.fromISO(s, { setZone: true }).toUTC()`, `daypart` enum `["morning","afternoon"]`, `duration` integer, `distance` positive number, `start_location`/`end_location` as optional `location_enum` values (`"home"` or `"work"`), and optional `speed`/`consumption`/`odometer` numbers. The transform SHALL run inside `zValidator` so that `c.req.valid('json')` yields the transformed `DateTime` values.

#### Scenario: Valid ISO datetime with offset transforms to UTC DateTime

- **GIVEN** a `POST /api/trips` body with `start_time: "2026-08-25T14:30:00+02:00"`
- **WHEN** the `zValidator` middleware runs the schema
- **THEN** `c.req.valid('json').start_time` SHALL be a Luxon `DateTime` with zone `UTC` representing `2026-08-25T12:30:00.000Z`

#### Scenario: Invalid daypart enum

- **GIVEN** a body with `daypart: "evening"`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `daypart` stating it must be `'morning'` or `'afternoon'`

#### Scenario: Non-positive distance rejected

- **GIVEN** a body with `distance: 0` (or negative)
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `distance` stating it must be greater than 0

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

#### Scenario: Invalid location enum rejected

- **GIVEN** a body with `start_location: "gym"`
- **WHEN** the schema is validated
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `start_location` stating it must be `'home'` or `'work'`

#### Scenario: Null location accepted

- **GIVEN** a body with `start_location: null` and `end_location: null`
- **WHEN** the schema is validated
- **THEN** the body SHALL be accepted; both fields SHALL be `null` in the validated output

### Requirement: Async foreign-key, uniqueness, and odometer checks in a single validation middleware

The system SHALL verify that `vehicle_id` (always) references an existing row, plus the `(vehicle_id, end_time)` uniqueness pre-check, plus the odometer monotonicity check, in a SINGLE async Hono middleware that runs AFTER `zValidator` and BEFORE `creationHandler`. The middleware SHALL read the validated input via `c.req.valid("json")` (the transformed `DateTime`-bearing value). On a missing `vehicle_id` reference, the middleware SHALL `throw` a `FOREIGN_KEY_VIOLATION` problem with status `422`. On a duplicate `(vehicle_id, end_time)`, the middleware SHALL `throw` a `TRIP_CONFLICT` problem with status `409`. On an odometer reading lower than the previous reading, the middleware SHALL `throw` a `FOREIGN_KEY_VIOLATION` problem with status `422`. Location values (`start_location`, `end_location`) SHALL NOT require a foreign-key check — they are constrained to the `location_enum` type by the Zod schema, so no row-existence query is needed.

#### Scenario: Middleware reads transformed DateTime, not raw body

- **GIVEN** a `POST /api/trips` body with `start_time: "2026-08-25T14:30:00+02:00"` has passed `zValidator`
- **WHEN** the single validation middleware runs
- **THEN** it SHALL read `c.req.valid("json").start_time` as a Luxon `DateTime` (zone `UTC`), and SHALL NOT read the raw `validator("json")` `req` parameter

#### Scenario: Non-existent vehicle rejected

- **GIVEN** a structurally valid body whose `vehicle_id` does not exist in the `vehicles` table
- **WHEN** the FK-check middleware runs
- **THEN** the system SHALL respond `422` `application/problem+json` whose `errors` extension identifies `vehicle_id` and whose `detail` indicates the vehicle does not exist

#### Scenario: Non-existent start_location rejected

- **GIVEN** a structurally valid body with `start_location` set to a value outside `"home"` / `"work"`
- **WHEN** the `zValidator` middleware runs the schema
- **THEN** the `422` problem+json response's `errors` extension array SHALL include an entry referencing `start_location` stating it must be `'home'` or `'work'` — the value is rejected at the Zod schema level by the enum constraint, NOT by a foreign-key existence check (no `locations` table exists)

#### Scenario: Location enum requires no FK check

- **GIVEN** a structurally valid body with `start_location='home'`
- **WHEN** the validation middleware runs
- **THEN** the middleware SHALL NOT issue a database query to verify the location exists; the `location_enum` constraint in the Zod schema is sufficient

#### Scenario: Handler contains no FK or conflict logic

- **GIVEN** the codebase after migration
- **WHEN** inspecting `creationHandler` in `src/backend/handlers.ts`
- **THEN** it SHALL perform only the INSERT and the `201` response shaping, with no vehicle/location existence queries, no unique-conflict detection, no `try/catch` around the INSERT, and no error-body construction

### Requirement: Unique-existence pre-check in single validation middleware

The system SHALL reject a `POST /api/trips` request whose `(vehicle_id, end_time)` already matches an existing row in `trips`, performed by the single validation middleware in `src/backend/validators.ts` that runs AFTER `zValidator` and BEFORE `creationHandler`. The middleware SHALL issue a `SELECT` against `trips` for a row with the request's `vehicle_id` and `end_time`; if a row is found the middleware SHALL `throw` a `TRIP_CONFLICT` problem (via the problem type registry) with status `409`, a `detail` indicating a trip with this `vehicle_id` and `end_time` already exists, and an `extensions` object carrying `vehicle_id` and `end_time`, so the response flows through `app.onError` as `application/problem+json`. The middleware SHALL NOT be implemented inside `creationHandler`, and `creationHandler` SHALL NOT catch a database unique-constraint violation.

#### Scenario: Pre-existing duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another `POST /api/trips` request is received with the same `vehicle_id` X and `end_time` T
- **THEN** the single validation middleware SHALL respond `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI, whose `detail` indicates a trip with this `vehicle_id` and `end_time` already exists, and whose `extensions` carries `vehicle_id` X and `end_time` T, and `creationHandler` SHALL NOT execute

#### Scenario: Non-duplicate trip passes the pre-check

- **GIVEN** no trip exists for `vehicle_id` X with `end_time` T
- **WHEN** a `POST /api/trips` request is received with `vehicle_id` X and `end_time` T
- **THEN** the single validation middleware SHALL return the request value unchanged

#### Scenario: Pre-check runs after foreign-key validation

- **GIVEN** a `POST /api/trips` request whose `vehicle_id` does not exist in `vehicles`
- **WHEN** the validation chain executes
- **THEN** the foreign-key check SHALL reject the request with `422` before the uniqueness pre-check queries the `trips` table

#### Scenario: Race condition surfaces as unhandled error

- **GIVEN** no trip exists for `vehicle_id` X with `end_time` T at pre-check time
- **WHEN** a row with `vehicle_id` X and `end_time` T is inserted into `trips` between the uniqueness pre-check `SELECT` and `creationHandler`'s `INSERT`
- **THEN** the database unique-constraint violation SHALL propagate uncaught to `app.onError` and the system SHALL respond `500` `application/problem+json` (per the `error-handling` capability), not `409`, and SHALL NOT be caught by the single validation middleware