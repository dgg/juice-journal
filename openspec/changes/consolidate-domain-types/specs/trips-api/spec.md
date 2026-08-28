## MODIFIED Requirements

### Requirement: Trips table

The system SHALL maintain a `trips` table with a synthetic 16-character nanoid primary key generated in Postgres via `nanoid-postgres` (`DEFAULT nanoid(16)`), a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL `TEXT` FK to `vehicles`), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location_id` (nullable `TEXT` FK to `locations`), `end_location_id` (nullable `TEXT` FK to `locations`), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration` (NOT NULL int), `distance` (NOT NULL NUMERIC(8,2)), `speed` (nullable NUMERIC(5,1)), `consumption` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()). Units SHALL NOT be encoded in column names; they are fixed per column and documented in the migration that introduces the column and on the consuming row type: `duration` is minutes, `distance` is kilometres, `speed` is kilometres per hour, `consumption` is kilowatt-hours per 100 kilometres, `odometer` is kilometres.

#### Scenario: Trip with full data

- **GIVEN** a vehicle and a start location exist
- **WHEN** a trip is created with `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `start_location_id`, `end_location_id`, `distance`, `speed`, `consumption`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with only the required fields `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, and `distance`
- **THEN** the system SHALL store the trip with nullable fields set to NULL

#### Scenario: Duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another trip is created with the same `vehicle_id` X and `end_time` T
- **THEN** the system SHALL reject the request with `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI and whose `detail` indicates a trip with this `vehicle_id` and `end_time` already exists

### Requirement: Duration handling

The system SHALL store the `duration` value provided in the request. This value SHALL take precedence over the computed `end_time - start_time` value.

#### Scenario: Duration from request overrides calculation

- **GIVEN** a trip creation with `start_time=08:00`, `end_time=08:45` (UTC, 45 min computed), and `duration=40`
- **WHEN** the trip is stored
- **THEN** the system SHALL store the trip with `duration=40`

#### Scenario: Duration matches calculation

- **GIVEN** a trip creation with `start_time=08:00`, `end_time=08:45` (UTC) and `duration=45`
- **WHEN** the trip is retrieved
- **THEN** the response SHALL include `duration=45`

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `distance`. Optional fields: `start_location_id`, `end_location_id`, `speed`, `consumption`, `weather_start`, `weather_end`, `odometer`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On schema validation failure, the system SHALL return `422 Unprocessable Content` as `application/problem+json` with field-level errors in the `errors` extension (per the `request-validation` capability). On a foreign-key violation, the system SHALL return `422` problem+json. When a trip with the same `vehicle_id` and `end_time` already exists, the system SHALL return `409` problem+json whose `type` is the registry-defined `TRIP_CONFLICT` URI, detected by a dedicated validation step that runs before the handler (per the `request-validation` capability); the handler itself SHALL NOT catch a database unique-constraint violation, so a concurrent race that violates the `UNIQUE(vehicle_id, end_time)` constraint at insert time SHALL surface as an unhandled error. On any other unhandled error, the system SHALL return `500` problem+json with a constant `detail` (per the `error-handling` capability).

#### Scenario: Successful trip creation

- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, and `distance`
- **THEN** the system SHALL insert the trip, store `daypart` from the request, and return `201` with the created record including its 16-character nanoid `id`

#### Scenario: Missing required field

- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent without `distance`
- **THEN** the system SHALL return `422` `application/problem+json` whose `errors` extension names the missing `distance` field

#### Scenario: Invalid vehicle_id

- **GIVEN** no vehicle exists with the given `vehicle_id`
- **WHEN** a `POST /api/trips` request is sent
- **THEN** the system SHALL return `422` `application/problem+json` with a `detail` indicating the vehicle does not exist

#### Scenario: Unhandled server error

- **GIVEN** the database insert throws an unexpected error (not a UNIQUE conflict)
- **WHEN** the error reaches `app.onError`
- **THEN** the system SHALL return `500` `application/problem+json` with `detail` equal to `"An unexpected error occurred"` and SHALL NOT expose the raw error message in the body

#### Scenario: Concurrent race on unique constraint yields 500

- **GIVEN** no trip exists for `vehicle_id` X with `end_time` T when the unique-existence pre-check runs
- **WHEN** a row with `vehicle_id` X and `end_time` T is inserted into `trips` between the pre-check and the handler's `INSERT`, causing a `UNIQUE(vehicle_id, end_time)` violation
- **THEN** the violation SHALL propagate uncaught and the system SHALL return `500` `application/problem+json` (per the `error-handling` capability) rather than `409`

### Requirement: Database migrations with dbmate

The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. The initial migration SHALL create `vehicles`, `locations`, and `trips` tables plus dbmate's `schema_migrations` table. A subsequent migration SHALL install the `nanoid-postgres` extension and alter the primary-key and foreign-key columns from `UUID` to `TEXT` with `DEFAULT nanoid(16)` on the `id` columns. A further migration SHALL rename the unit-suffixed `trips` columns to unit-free names (`duration_min`→`duration`, `distance_km`→`distance`, `avg_speed_kmh`→`speed`, `avg_consumption_kwh_100km`→`consumption`, `odometer_km`→`odometer`) and SHALL document each column's unit in a SQL comment. Migrations SHALL be runnable locally via `bunx dbmate up`.

#### Scenario: Initial migration applies cleanly

- **GIVEN** an empty Postgres database (from docker-compose)
- **WHEN** `bunx dbmate up` is run
- **THEN** all three tables and the `schema_migrations` table SHALL exist

#### Scenario: Down migration rolls back

- **GIVEN** the initial migration has been applied
- **WHEN** `bunx dbmate down` is run
- **THEN** the `trips`, `locations`, and `vehicles` tables SHALL be dropped (in correct FK order)

#### Scenario: Nanoid migration alters column types

- **GIVEN** the initial migration is applied with UUID columns
- **WHEN** the nanoid migration is applied
- **THEN** the `id` columns on `vehicles`, `locations`, and `trips` SHALL be `TEXT DEFAULT nanoid(16)`, the FK columns on `trips` SHALL be `TEXT`, and the `nanoid-postgres` extension SHALL be installed

#### Scenario: Column rename migration drops unit suffixes

- **GIVEN** the nanoid migration is applied and the `trips` table has unit-suffixed columns
- **WHEN** the column rename migration is applied
- **THEN** the `trips` table SHALL have columns named `duration`, `distance`, `speed`, `consumption`, and `odometer`, each carrying a SQL comment documenting its unit, and no unit-suffixed column SHALL remain

#### Scenario: Column rename down migration restores suffixes

- **GIVEN** the column rename migration has been applied
- **WHEN** `bunx dbmate down` is run for that migration
- **THEN** the `trips` table SHALL restore the unit-suffixed column names (`duration_min`, `distance_km`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `odometer_km`)