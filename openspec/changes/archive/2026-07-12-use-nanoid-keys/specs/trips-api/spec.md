## MODIFIED Requirements

### Requirement: Vehicles table

The system SHALL maintain a `vehicles` table with a synthetic 16-character nanoid primary key (`id`) generated in Postgres via the `nanoid-postgres` extension (`DEFAULT nanoid(16)`), a `description` field, and audit columns (`created_at`, `updated_at`). At least one vehicle record MUST exist before a trip can be created.

#### Scenario: Vehicle exists for trip creation

- **GIVEN** no vehicles exist in the database
- **WHEN** a `POST /api/trips` request is received with a `vehicle_id`
- **THEN** the system SHALL reject the request with `400` and a message indicating the vehicle does not exist

#### Scenario: Vehicle referenced by trip

- **GIVEN** a vehicle with `id` exists in the database
- **WHEN** a trip is created referencing that `vehicle_id`
- **THEN** the trip record SHALL store the `vehicle_id` as a foreign key to the `vehicles` table

### Requirement: Locations table

The system SHALL maintain a `locations` table storing commute endpoints with `id` (16-character nanoid generated in Postgres via `nanoid-postgres`, `DEFAULT nanoid(16)`), `label` (text), `latitude` (`DECIMAL(9,6)`), `longitude` (`DECIMAL(9,6)`), `timezone` (IANA name text), and audit columns. Both `latitude` and `longitude` MUST be within valid ranges (-90 to 90, -180 to 180).

#### Scenario: Location with valid coordinates

- **GIVEN** the database is initialized
- **WHEN** a location is created with `latitude=55.676098` and `longitude=12.568337`
- **THEN** the system SHALL store the location and accept it as a reference from a trip

#### Scenario: Location referenced as trip start or end

- **GIVEN** a location exists
- **WHEN** a trip is created with `start_location_id` or `end_location_id` referencing that location
- **THEN** the trip SHALL store the foreign key and the location's `timezone` SHALL be usable for display timezone resolution

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
- **THEN** the system SHALL reject the request with `409 Conflict`

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`. Optional fields: `start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`. On success, the system SHALL return `201 Created` with the full trip record (including the generated 16-character nanoid `id`, `tracking_created`, `tracking_updated`). On validation failure, the system SHALL return `400 Bad Request` with field-level error messages.

#### Scenario: Successful trip creation

- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km`
- **THEN** the system SHALL insert the trip, store `daypart` from the request, and return `201` with the created record including its 16-character nanoid `id`

#### Scenario: Missing required field

- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent without `distance_km`
- **THEN** the system SHALL return `400` with an error message naming the missing field

#### Scenario: Invalid vehicle_id

- **GIVEN** no vehicle exists with the given `vehicle_id`
- **WHEN** a `POST /api/trips` request is sent
- **THEN** the system SHALL return `400` with a message indicating the vehicle does not exist

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
