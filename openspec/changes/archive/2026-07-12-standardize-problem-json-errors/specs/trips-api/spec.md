## MODIFIED Requirements

### Requirement: Vehicles table

The system SHALL maintain a `vehicles` table with a synthetic UUID primary key (`id`), a `description` field, and audit columns (`created_at`, `updated_at`). At least one vehicle record MUST exist before a trip can be created.

#### Scenario: Vehicle exists for trip creation

- **GIVEN** no vehicles exist in the database
- **WHEN** a `POST /api/trips` request is received with a `vehicle_id`
- **THEN** the system SHALL reject the request with `422` `application/problem+json` (per the `error-handling` and `request-validation` capabilities) with a `detail` indicating the vehicle does not exist

#### Scenario: Vehicle referenced by trip

- **GIVEN** a vehicle with `id` exists in the database
- **WHEN** a trip is created referencing that `vehicle_id`
- **THEN** the trip record SHALL store the `vehicle_id` as a foreign key to the `vehicles` table

### Requirement: Trips table

The system SHALL maintain a `trips` table with a synthetic UUID primary key, a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL FK), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location_id` (nullable FK), `end_location_id` (nullable FK), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration_min` (NOT NULL int), `distance_km` (NOT NULL NUMERIC(8,2)), `avg_speed_kmh` (nullable NUMERIC(5,1)), `avg_consumption_kwh_100km` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer_km` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()).

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

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, `distance_km`. Optional fields: `start_location_id`, `end_location_id`, `avg_speed_kmh`, `avg_consumption_kwh_100km`, `weather_start`, `weather_end`, `odometer_km`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On schema validation failure, the system SHALL return `422 Unprocessable Content` as `application/problem+json` with field-level errors in the `errors` extension (per the `request-validation` capability). On a foreign-key violation, the system SHALL return `422` problem+json. On a `UNIQUE(vehicle_id, end_time)` conflict, the system SHALL return `409` problem+json. On any other unhandled error, the system SHALL return `500` problem+json with a constant `detail` (per the `error-handling` capability).

#### Scenario: Successful trip creation

- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration_min`, and `distance_km`
- **THEN** the system SHALL insert the trip, store `daypart` from the request, and return `201` with the created record including its `id`

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
