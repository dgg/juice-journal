## ADDED Requirements

### Requirement: Cars table
The system SHALL maintain a `cars` table with a synthetic UUID primary key (`id`), a `description` field, and audit columns (`created_at`, `updated_at`). At least one car record MUST exist before a trip can be created.

#### Scenario: Car exists for trip creation
- **GIVEN** no cars exist in the database
- **WHEN** a `POST /api/trips` request is received with a `car_id`
- **THEN** the system SHALL reject the request with `400` and a message indicating the car does not exist

#### Scenario: Car referenced by trip
- **GIVEN** a car with `id` exists in the database
- **WHEN** a trip is created referencing that `car_id`
- **THEN** the trip record SHALL store the `car_id` as a foreign key to the `cars` table

### Requirement: Locations table
The system SHALL maintain a `locations` table storing commute endpoints with `id` (UUID), `label` (text), `latitude` (`DECIMAL(9,6)`), `longitude` (`DECIMAL(9,6)`), `timezone` (IANA name text), and audit columns. Both `latitude` and `longitude` MUST be within valid ranges (-90 to 90, -180 to 180).

#### Scenario: Location with valid coordinates
- **GIVEN** the database is initialized
- **WHEN** a location is created with `latitude=55.676098` and `longitude=12.568337`
- **THEN** the system SHALL store the location and accept it as a reference from a trip

#### Scenario: Location referenced as trip start or end
- **GIVEN** a location exists
- **WHEN** a trip is created with `start_location_id` or `end_location_id` referencing that location
- **THEN** the trip SHALL store the foreign key and the location's `timezone` SHALL be usable for display timezone resolution

### Requirement: Trips table
The system SHALL maintain a `trips` table with a synthetic UUID primary key, a `UNIQUE(car_id, end_time)` constraint, and the following columns: `car_id` (NOT NULL FK), `start_time` (nullable timestamptz), `end_time` (NOT NULL timestamptz), `start_location_id` (nullable FK), `end_location_id` (nullable FK), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration_min` (nullable int, set only when `start_time` is NULL), `distance_km` (NOT NULL NUMERIC(8,2)), `avg_speed_kmh` (nullable NUMERIC(5,1)), `avg_consumption_kwh_100km` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer_km` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()).

#### Scenario: Trip with full data
- **GIVEN** a car and a start location exist
- **WHEN** a trip is created with `car_id`, `start_time`, `end_time`, `start_location_id`, `end_location_id`, `distance_km`, `avg_speed_kmh`, `avg_consumption_kwh_100km`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data
- **GIVEN** a car exists
- **WHEN** a trip is created with only `car_id`, `end_time`, `distance_km`, and `daypart`
- **THEN** the system SHALL store the trip with nullable fields set to NULL

#### Scenario: Duplicate trip rejected
- **GIVEN** a trip exists for `car_id` X with `end_time` T
- **WHEN** another trip is created with the same `car_id` X and `end_time` T
- **THEN** the system SHALL reject the request with `409 Conflict`

### Requirement: Daypart derivation
The system SHALL compute `daypart` from `end_time`: if the hour of `end_time` (in display timezone) is less than 12, `daypart` SHALL be `morning`; otherwise `afternoon`. The value SHALL be stored in the `daypart` enum column at write time.

#### Scenario: Morning trip
- **GIVEN** a trip is submitted with `end_time` at 08:30 display-local time
- **WHEN** the trip is stored
- **THEN** `daypart` SHALL be `morning`

#### Scenario: Afternoon trip
- **GIVEN** a trip is submitted with `end_time` at 17:15 display-local time
- **WHEN** the trip is stored
- **THEN** `daypart` SHALL be `afternoon`

### Requirement: Duration derivation
The system SHALL compute trip duration as `end_time - start_time` at read time when `start_time` is present. When `start_time` is NULL, the system SHALL use the stored `duration_min` value. When neither is available, duration SHALL be null.

#### Scenario: Duration from timestamps
- **GIVEN** a trip with `start_time=08:00` and `end_time=08:45` (UTC)
- **WHEN** the trip is retrieved
- **THEN** the response SHALL include `duration_min=45`

#### Scenario: Duration from manual entry
- **GIVEN** a trip with `start_time=NULL` and `duration_min=40`
- **WHEN** the trip is retrieved
- **THEN** the response SHALL include `duration_min=40`

### Requirement: POST /api/trips endpoint
The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `car_id`, `end_time`, `distance_km`. Optional fields: `start_time`, `start_location_id`, `end_location_id`, `duration_min`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `daypart`, `tracking_created`, `tracking_updated`). On validation failure, the system SHALL return `400 Bad Request` with field-level error messages.

#### Scenario: Successful trip creation
- **GIVEN** a car with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `car_id`, `end_time`, and `distance_km`
- **THEN** the system SHALL insert the trip, compute `daypart`, and return `201` with the created record including its `id`

#### Scenario: Missing required field
- **GIVEN** a car exists
- **WHEN** a `POST /api/trips` request is sent without `distance_km`
- **THEN** the system SHALL return `400` with an error message naming the missing field

#### Scenario: Invalid car_id
- **GIVEN** no car exists with the given `car_id`
- **WHEN** a `POST /api/trips` request is sent
- **THEN** the system SHALL return `400` with a message indicating the car does not exist

### Requirement: GET /api/trips endpoint (current month)
The system SHALL expose `GET /api/trips` returning trips for the current calendar month in the display timezone. Display timezone SHALL be resolved as: `end_location.timezone` → `start_location.timezone` → app config default (`DISPLAY_TZ`, default `Europe/Copenhagen`). Month bounds SHALL be computed as inclusive start / exclusive end in UTC. The response SHALL be `200 OK` with a JSON array of trip objects, sorted by `end_time` descending. If no trips exist, the response SHALL be an empty array.

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

### Requirement: Display timezone resolution
The system SHALL resolve the display timezone for month-boundary computation using the following fallback chain: `end_location.timezone` → `start_location.timezone` → `DISPLAY_TZ` env var (default `Europe/Copenhagen`). All stored timestamps SHALL be in UTC; only display and month-boundary computation uses the resolved timezone.

#### Scenario: Location timezone takes priority
- **GIVEN** a trip with `end_location` having `timezone=Europe/Copenhagen` and `DISPLAY_TZ=UTC`
- **WHEN** the current month is computed for that trip
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

#### Scenario: Config fallback when no location
- **GIVEN** a trip with no `start_location_id` or `end_location_id` and `DISPLAY_TZ=Europe/Copenhagen`
- **WHEN** the current month is computed for that trip
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

### Requirement: Database migrations with dbmate
The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. The initial migration SHALL create `cars`, `locations`, and `trips` tables plus dbmate's `schema_migrations` table. Migrations SHALL be runnable locally via `bunx dbmate up`.

#### Scenario: Initial migration applies cleanly
- **GIVEN** an empty Postgres database (from docker-compose)
- **WHEN** `bunx dbmate up` is run
- **THEN** all three tables and the `schema_migrations` table SHALL exist

#### Scenario: Down migration rolls back
- **GIVEN** the initial migration has been applied
- **WHEN** `bunx dbmate down` is run
- **THEN** the `trips`, `locations`, and `cars` tables SHALL be dropped (in correct FK order)

### Requirement: Postgres client singleton
The system SHALL expose a single `Bun.sql` instance in `src/db/client.ts` configured from environment variables (`DATABASE_URL` or individual `PG*` vars). All route handlers SHALL use this singleton for database access.

#### Scenario: Client reused across requests
- **GIVEN** the server is running
- **WHEN** multiple `POST /api/trips` and `GET /api/trips` requests are handled
- **THEN** all requests SHALL use the same `Bun.sql` instance without creating new connections per request
