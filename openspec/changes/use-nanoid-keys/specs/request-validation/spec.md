## MODIFIED Requirements

### Requirement: Field types and constraints enforced

The schema SHALL enforce: `vehicle_id` as a 16-character nanoid-format string, `start_time`/`end_time` as ISO 8601 datetimes (`z.string().datetime()`), `daypart` enum `["morning","afternoon"]`, `duration_min` integer, `distance_km` positive number, `start_location_id`/`end_location_id` as optional 16-character nanoid-format strings, and optional `avg_speed_kmh`/`avg_consumption_kwh_100km`/`odometer_km` numbers and `weather_start`/`weather_end` objects.

#### Scenario: Invalid daypart enum

- **GIVEN** a body with `daypart: "evening"`
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `daypart` stating it must be `'morning'` or `'afternoon'`

#### Scenario: Non-positive distance rejected

- **GIVEN** a body with `distance_km: 0` (or negative)
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `distance_km` stating it must be greater than 0

#### Scenario: Non-ISO timestamp rejected

- **GIVEN** a body with `start_time: "yesterday"`
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `start_time` stating it must be a valid ISO 8601 timestamp

#### Scenario: UUID-shaped vehicle_id rejected

- **GIVEN** a body with `vehicle_id` set to a 36-character UUID string (e.g. `550e8400-e29b-41d4-a716-446655440000`)
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `vehicle_id` stating it must be a 16-character nanoid

#### Scenario: Malformed nanoid rejected

- **GIVEN** a body with `vehicle_id` set to a 16-character string containing characters outside the nanoid alphabet (e.g. containing spaces)
- **WHEN** the schema is validated
- **THEN** the system SHALL respond `400` whose `details` include an entry referencing `vehicle_id` stating it must be a 16-character nanoid
