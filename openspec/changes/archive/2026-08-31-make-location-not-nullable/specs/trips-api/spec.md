## MODIFIED Requirements

### Requirement: Trips table

The system SHALL maintain a `trips` table with a synthetic 16-character nanoid primary key generated in Postgres via `nanoid-postgres` (`DEFAULT nanoid(16)`), a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL `TEXT` FK to `vehicles`), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location` (NOT NULL `location_enum` — `'home'` or `'work'`), `end_location` (NOT NULL `location_enum` — `'home'` or `'work'`), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration` (NOT NULL int), `distance` (NOT NULL NUMERIC(8,2)), `speed` (nullable NUMERIC(5,1)), `consumption` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()). Units SHALL NOT be encoded in column names; they are fixed per column and documented in the migration that introduces the column and on the consuming row type: `duration` is minutes, `distance` is kilometres, `speed` is kilometres per hour, `consumption` is kilowatt-hours per 100 kilometres, `odometer` is kilometres. The `location_enum` type SHALL be `CREATE TYPE location_enum AS ENUM('home','work')` and SHALL be created by the initial migration.

#### Scenario: Trip with full data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `start_location='home'`, `end_location='work'`, `distance`, `speed`, `consumption`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with only the required fields `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `distance`, `start_location`, and `end_location`
- **THEN** the system SHALL store the trip with nullable fields (speed, consumption, weather, odometer) set to NULL and location fields set to the provided values

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `distance`, `start_location`, `end_location`. Optional fields: `speed`, `consumption`, `weather_start`, `weather_end`, `odometer`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On schema validation failure, the system SHALL return `422 Unprocessable Content` as `application/problem+json` with field-level errors in the `errors` extension (per the `request-validation` capability). On a foreign-key violation (non-existent `vehicle_id`), the system SHALL return `422` problem+json. When a trip with the same `vehicle_id` and `end_time` already exists, the system SHALL return `409` problem+json whose `type` is the registry-defined `TRIP_CONFLICT` URI, detected by a dedicated validation step that runs before the handler (per the `request-validation` capability); the handler itself SHALL NOT catch a database unique-constraint violation, so a concurrent race that violates the `UNIQUE(vehicle_id, end_time)` constraint at insert time SHALL surface as an unhandled error. On any other unhandled error, the system SHALL return `500` problem+json with a constant `detail` (per the `error-handling` capability).

#### Scenario: Successful trip creation with locations

- **GIVEN** a vehicle with `id` exists
- **WHEN** a `POST /api/trips` request is sent with valid `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `distance`, `start_location='home'`, `end_location='work'`
- **THEN** the system SHALL insert the trip, store `daypart` from the request, and return `201` with the created record including its 16-character nanoid `id`

#### Scenario: Missing start_location rejected

- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent with all required fields except `start_location`
- **THEN** the system SHALL return `422` `application/problem+json` whose `errors` extension names the missing `start_location` field

#### Scenario: Missing end_location rejected

- **GIVEN** a vehicle exists
- **WHEN** a `POST /api/trips` request is sent with all required fields except `end_location`
- **THEN** the system SHALL return `422` `application/problem+json` whose `errors` extension names the missing `end_location` field

### Requirement: Database migrations with dbmate

The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. The initial migration SHALL create the `nanoid-postgres` extension, the `daypart_enum` and `location_enum` types, the `vehicles` and `trips` tables (with nanoid `TEXT` primary keys `DEFAULT nanoid(16)` from the outset, unit-free column names with SQL comments documenting each column's unit, `start_location`/`end_location` as `location_enum NOT NULL` columns, and no `locations` table). Because no existing production data exists, the change edits the single init migration file rather than adding a new migration. A seed migration SHALL insert a single default vehicle row (`description='commuter'`). Migrations SHALL be runnable locally via `bunx dbmate up`.

#### Scenario: Init migration creates NOT NULL locations

- **GIVEN** the database is clean (no prior migration applied)
- **WHEN** `bunx dbmate up` is run
- **THEN** `start_location` and `end_location` SHALL be `location_enum NOT NULL` columns in the `trips` table

### Requirement: Location enum columns on trips

- **GIVEN** the migrations have been applied
- **WHEN** the `trips` table columns are inspected
- **THEN** `start_location` and `end_location` SHALL be NOT NULL `location_enum` columns (type `home` or `work`); no `start_location_id` or `end_location_id` columns SHALL exist