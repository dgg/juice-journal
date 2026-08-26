# Trips API Specification

## Purpose

Defines the database schema and API endpoints for managing vehicle trips, including data models for vehicles, locations, and trip records, with comprehensive validation and timezone-aware month fetching.

## Requirements

### Requirement: Vehicles table

The system SHALL maintain a `vehicles` table with a synthetic 16-character nanoid primary key (`id`) generated in Postgres via the `nanoid-postgres` extension (`DEFAULT nanoid(16)`), a `description` field, and audit columns (`created_at`, `updated_at`). At least one vehicle record MUST exist before a trip can be created.

#### Scenario: Vehicle exists for trip creation

- **GIVEN** no vehicles exist in the database
- **WHEN** a `POST /api/trips` request is received with a `vehicle_id`
- **THEN** the system SHALL reject the request with `422` `application/problem+json` (per the `error-handling` and `request-validation` capabilities) with a `detail` indicating the vehicle does not exist

#### Scenario: Vehicle referenced by trip

- **GIVEN** a vehicle with `id` exists in the database
- **WHEN** a trip is created referencing that `vehicle_id`
- **THEN** the trip record SHALL store the `vehicle_id` as a foreign key to the `vehicles` table

### Requirement: Locations table

The system SHALL maintain a `locations` table storing commute endpoints with `id` (16-character nanoid generated in Postgres via `nanoid-postgres`, `DEFAULT nanoid(16)`), `label` (text), `latitude` (`DECIMAL(9,6)`), `longitude` (`DECIMAL(9,6)`), and audit columns. Both `latitude` and `longitude` MUST be within valid ranges (-90 to 90, -180 to 180).

#### Scenario: Location with valid coordinates

- **GIVEN** the database is initialized
- **WHEN** a location is created with `latitude=55.676098` and `longitude=12.568337`
- **THEN** the system SHALL store the location and accept it as a reference from a trip

#### Scenario: Location referenced as trip start or end

- **GIVEN** a location exists
- **WHEN** a trip is created with `start_location_id` or `end_location_id` referencing that location
- **THEN** the trip SHALL store the foreign key; the location row SHALL NOT carry a `timezone` column

### Requirement: Trips table

The system SHALL maintain a `trips` table with a synthetic 16-character nanoid primary key generated in Postgres via `nanoid-postgres` (`DEFAULT nanoid(16)`), a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL `TEXT` FK to `vehicles`), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location_id` (nullable `TEXT` FK to `locations`), `end_location_id` (nullable `TEXT` FK to `locations`), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration_min` (NOT NULL int), `distance_km` (NOT NULL NUMERIC(8,2)), `avg_speed_kmh` (nullable NUMERIC(5,1)), `avg_consumption_kwh_100km` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer_km` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()).

#### Scenario: Trip with full data

- **GIVEN** a vehicle and a start location exist
- **WHEN** a trip is created with `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `start_location_id`, `end_location_id`, `distance_km`, `avg_speed_kmh`, `avg_consumption_kwh_100km`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with only the required fields `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km`
- **THEN** the system SHALL store the trip with nullable fields set to NULL

#### Scenario: Duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another trip is created with the same `vehicle_id` X and `end_time` T
- **THEN** the system SHALL reject the request with `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI and whose `detail` indicates a trip with this `vehicle_id` and `end_time` already exists

### Requirement: Duration handling

The system SHALL store the `duration_min` value provided in the request. This value SHALL take precedence over the computed `end_time - start_time` value.

#### Scenario: Duration from request overrides calculation

- **GIVEN** a trip creation with `start_time=08:00`, `end_time=08:45` (UTC, 45 min computed), and `duration_min=40`
- **WHEN** the trip is stored
- **THEN** the system SHALL store the trip with `duration_min=40`

#### Scenario: Duration matches calculation

- **GIVEN** a trip creation with `start_time=08:00`, `end_time=08:45` (UTC) and `duration_min=45`
- **WHEN** the trip is retrieved
- **THEN** the response SHALL include `duration_min=45`

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`. Optional fields: `start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On schema validation failure, the system SHALL return `422 Unprocessable Content` as `application/problem+json` with field-level errors in the `errors` extension (per the `request-validation` capability). On a foreign-key violation, the system SHALL return `422` problem+json. When a trip with the same `vehicle_id` and `end_time` already exists, the system SHALL return `409` problem+json whose `type` is the registry-defined `TRIP_CONFLICT` URI, detected by a dedicated validation step that runs before the handler (per the `request-validation` capability); the handler itself SHALL NOT catch a database unique-constraint violation, so a concurrent race that violates the `UNIQUE(vehicle_id, end_time)` constraint at insert time SHALL surface as an unhandled error. On any other unhandled error, the system SHALL return `500` problem+json with a constant `detail` (per the `error-handling` capability).

#### Scenario: Successful trip creation

- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km`
- **THEN** the system SHALL insert the trip, store `daypart` from the request, and return `201` with the created record including its 16-character nanoid `id`

#### Scenario: Missing required field

- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent without `distance_km`
- **THEN** the system SHALL return `422` `application/problem+json` whose `errors` extension names the missing `distance_km` field

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

### Requirement: GET /api/trips endpoint (current month)

The system SHALL expose `GET /api/trips` returning trips for the current calendar month in the display timezone. Display timezone SHALL be resolved via the `date-handling` capability's `displayTz` (returns `DISPLAY_TZ`, default `Europe/Copenhagen`). Month bounds SHALL be computed via the `date-handling` capability's `currentMonthBoundsUtc` as inclusive start / exclusive end in UTC, returned as UTC `DateTime` instances; the query layer SHALL serialize them to ISO strings for the SQL comparison. The response SHALL be `200 OK` with a JSON array of trip objects, sorted by `end_time` descending. If no trips exist, the response SHALL be an empty array.

#### Scenario: Trips exist in current month

- **GIVEN** two trips exist with `end_time` in the current calendar month (display tz) and one trip exists in a previous month
- **WHEN** a `GET /api/trips` request is sent
- **THEN** the system SHALL return `200` with an array of two trips, sorted by `end_time` descending, excluding the previous-month trip

#### Scenario: No trips in current month

- **GIVEN** no trips exist in the current calendar month
- **WHEN** a `GET /api/trips` request is sent
- **THEN** the system SHALL return `200` with an empty array `[]`

#### Scenario: Timezone boundary at month edge

- **GIVEN** a trip with `end_time` at 23:59 on the last day of the month in `Europe/Copenhagen` (which is 21:59 or 22:59 UTC depending on DST)
- **WHEN** a `GET /api/trips` request is sent during that month
- **THEN** the trip SHALL be included in the response

### Requirement: Display timezone from environment variable

The system SHALL resolve the display timezone for month-boundary computation via the `date-handling` capability's `displayTz` function, which returns the `DISPLAY_TZ` environment variable (default `Europe/Copenhagen`). The system SHALL NOT consult location columns for timezone resolution. All stored timestamps SHALL be in UTC; only display and month-boundary computation uses the resolved timezone.

#### Scenario: DISPLAY_TZ used for boundary computation

- **GIVEN** `DISPLAY_TZ=Europe/Copenhagen`
- **WHEN** the current month is computed
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

#### Scenario: DISPLAY_TZ unset defaults to Copenhagen

- **GIVEN** `DISPLAY_TZ` is unset
- **WHEN** the current month is computed
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

### Requirement: Database migrations with dbmate

The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. The initial migration SHALL create `vehicles`, `locations`, and `trips` tables plus dbmate's `schema_migrations` table. A subsequent migration SHALL install the `nanoid-postgres` extension and alter the primary-key and foreign-key columns from `UUID` to `TEXT` with `DEFAULT nanoid(16)` on the `id` columns. Migrations SHALL be runnable locally via `bunx dbmate up`.

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

### Requirement: Postgres client singleton

The system SHALL expose a single `Bun.sql` instance in `src/db/client.ts` configured from environment variables (`DATABASE_URL` or individual `PG*` vars). All route handlers SHALL use this singleton for database access.

#### Scenario: Client reused across requests

- **GIVEN** the server is running
- **WHEN** multiple `POST /api/trips` and `GET /api/trips` requests are handled
- **THEN** all requests SHALL use the same `Bun.sql` instance without creating new connections per request
