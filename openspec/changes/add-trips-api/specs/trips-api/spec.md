## ADDED Requirements

### Requirement: Vehicles table
The system SHALL maintain a `vehicles` table with a synthetic UUID primary key (`id`), a `description` field, and audit columns (`created_at`, `updated_at`). At least one vehicle record MUST exist before a trip can be created.

#### Scenario: Vehicle exists for trip creation
- **GIVEN** no vehicles exist in the database
- **WHEN** a `POST /api/trips` request is received with a `vehicle_id`
- **THEN** the system SHALL reject the request with `400` and a message indicating the vehicle does not exist

#### Scenario: Vehicle referenced by trip
- **GIVEN** a vehicle with `id` exists in the database
- **WHEN** a trip is created referencing that `vehicle_id`
- **THEN** the trip record SHALL store the `vehicle_id` as a foreign key to the `vehicles` table

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
The system SHALL maintain a `trips` table with a synthetic UUID primary key, a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL FK), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location_id` (nullable FK), `end_location_id` (nullable FK), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration_min` (nullable int, set only when `start_time` is NULL), `distance_km` (NOT NULL NUMERIC(8,2)), `avg_speed_kmh` (nullable NUMERIC(5,1)), `avg_consumption_kwh_100km` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer_km` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()).

#### Scenario: Trip with full data
- **GIVEN** a vehicle and a start location exist
- **WHEN** a trip is created with `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `start_location_id`, `end_location_id`, `distance_km`, `avg_speed_kmh`, `avg_consumption_kwh_100km`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data
- **GIVEN** a vehicle exists
- **WHEN** a trip is created with only `vehicle_id`, `start_time`, `end_time`, `daypart`, `distance_km`, and `daypart`
- **THEN** the system SHALL store the trip with nullable fields set to NULL

#### Scenario: Duplicate trip rejected
- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another trip is created with the same `vehicle_id` X and `end_time` T
- **THEN** the system SHALL reject the request with `409 Conflict`

### Requirement: Duration derivation
The system SHALL compute trip duration as `end_time - start_time` at write time when `duration` is not present.
If present, the passed duration is stored.

#### Scenario: Duration from timestamps
- **GIVEN** a trip creation with `start_time=08:00` and `end_time=08:45` (UTC) and no `duration`
- **WHEN** the trip is stored
- **THEN** the system SHALL store the trip with `duration_min=45`

#### Scenario: Duration from manual entry
- **GIVEN** a trip creation with `duration_min=40`
- **WHEN** the trip is retrieved
- **THEN** the response SHALL include `duration_min=40` regardless of what the computed duration would be

### Requirement: POST /api/trips endpoint
The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `distance_km`. Optional fields: `start_location_id`, `end_location_id`, `duration_min`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On validation failure, the system SHALL return `400 Bad Request` with field-level error messages.

#### Scenario: Successful trip creation
- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `end_time`, and `distance_km`
- **THEN** the system SHALL insert the trip, compute `daypart`, and return `201` with the created record including its `id`

#### Scenario: Missing required field
- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent without `distance_km`
- **THEN** the system SHALL return `400` with an error message naming the missing field

#### Scenario: Invalid vehicle_id
- **GIVEN** no vehicle exists with the given `vehicle_id`
- **WHEN** a `POST /api/trips` request is sent
- **THEN** the system SHALL return `400` with a message indicating the vehicle does not exist

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
The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. The initial migration SHALL create `vehicles`, `locations`, and `trips` tables plus dbmate's `schema_migrations` table. Migrations SHALL be runnable locally via `bunx dbmate up`.

#### Scenario: Initial migration applies cleanly
- **GIVEN** an empty Postgres database (from docker-compose)
- **WHEN** `bunx dbmate up` is run
- **THEN** all three tables and the `schema_migrations` table SHALL exist

#### Scenario: Down migration rolls back
- **GIVEN** the initial migration has been applied
- **WHEN** `bunx dbmate down` is run
- **THEN** the `trips`, `locations`, and `vehicles` tables SHALL be dropped (in correct FK order)

### Requirement: Postgres client singleton
The system SHALL expose a single `Bun.sql` instance in `src/db/client.ts` configured from environment variables (`DATABASE_URL` or individual `PG*` vars). All route handlers SHALL use this singleton for database access.

#### Scenario: Client reused across requests
- **GIVEN** the server is running
- **WHEN** multiple `POST /api/trips` and `GET /api/trips` requests are handled
- **THEN** all requests SHALL use the same `Bun.sql` instance without creating new connections per request
