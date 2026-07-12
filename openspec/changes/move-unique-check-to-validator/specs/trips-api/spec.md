## MODIFIED Requirements

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
