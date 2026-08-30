## REMOVED Requirements

### Requirement: Locations table

**Reason**: The `locations` table stored exactly two rows ("home", "work") whose only live purpose was providing coordinates for weather fetching. After the timezone column was dropped, no consumer remained besides coordinate lookup. Coordinates now live in `HOME_LATLNG`/`WORK_LATLNG` environment variables (matching the `DISPLAY_TZ` precedent), eliminating the table, its FK indirection, and the confidential (0,0) seed that required manual patching.

**Migration**: The `locations` table is dropped. `trips.start_location_id` and `trips.end_location_id` FK columns are replaced by `trips.start_location` and `trips.end_location` enum columns (`location_enum AS ENUM('home','work')`, nullable). Location coordinates for weather are resolved at runtime from `HOME_LATLNG`/`WORK_LATLNG` env vars. Existing trip rows (if any) are backfilled by joining `start_location_id`/`end_location_id` to `locations.label` before the FK columns are dropped; since the database is not yet live, a fresh build requires no backfill.

## MODIFIED Requirements

### Requirement: Trips table

The system SHALL maintain a `trips` table with a synthetic 16-character nanoid primary key generated in Postgres via `nanoid-postgres` (`DEFAULT nanoid(16)`), a `UNIQUE(vehicle_id, end_time)` constraint, and the following columns: `vehicle_id` (NOT NULL `TEXT` FK to `vehicles`), `start_time` (NOT NULL timestamptz), `end_time` (NOT NULL timestamptz), `start_location` (nullable `location_enum` — `'home'` or `'work'`), `end_location` (nullable `location_enum` — `'home'` or `'work'`), `daypart` (enum `morning`/`afternoon`, NOT NULL), `duration` (NOT NULL int), `distance` (NOT NULL NUMERIC(8,2)), `speed` (nullable NUMERIC(5,1)), `consumption` (nullable NUMERIC(6,2)), `weather_start` (nullable JSONB), `weather_end` (nullable JSONB), `odometer` (nullable NUMERIC(8,1)), `tracking_created` (timestamptz default now()), `tracking_updated` (timestamptz default now()). Units SHALL NOT be encoded in column names; they are fixed per column and documented in the migration that introduces the column and on the consuming row type: `duration` is minutes, `distance` is kilometres, `speed` is kilometres per hour, `consumption` is kilowatt-hours per 100 kilometres, `odometer` is kilometres. The `location_enum` type SHALL be `CREATE TYPE location_enum AS ENUM('home','work')` and SHALL be created by the initial migration.

#### Scenario: Trip with full data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `start_location='home'`, `end_location='work'`, `distance`, `speed`, `consumption`
- **THEN** the system SHALL store all fields and set `tracking_created` and `tracking_updated` to the current timestamp

#### Scenario: Trip with minimal data

- **GIVEN** a vehicle exists
- **WHEN** a trip is created with only the required fields `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, and `distance`
- **THEN** the system SHALL store the trip with nullable fields set to NULL (including `start_location` and `end_location`)

#### Scenario: Duplicate trip rejected

- **GIVEN** a trip exists for `vehicle_id` X with `end_time` T
- **WHEN** another trip is created with the same `vehicle_id` X and `end_time` T
- **THEN** the system SHALL reject the request with `409 Conflict` `application/problem+json` whose `type` is the registry-defined `TRIP_CONFLICT` URI and whose `detail` indicates a trip with this `vehicle_id` and `end_time` already exists

### Requirement: POST /api/trips endpoint

The system SHALL expose `POST /api/trips` accepting a JSON body. Required fields: `vehicle_id`, `start_time`, `end_time`, `daypart`, `duration`, `distance`. Optional fields: `start_location` (`'home'` or `'work'`), `end_location` (`'home'` or `'work'`), `speed`, `consumption`, `weather_start`, `weather_end`, `odometer`. On success, the system SHALL return `201 Created` with the full trip record (including generated `id`, `tracking_created`, `tracking_updated`). On schema validation failure, the system SHALL return `422 Unprocessable Content` as `application/problem+json` with field-level errors in the `errors` extension (per the `request-validation` capability). On a foreign-key violation (non-existent `vehicle_id`), the system SHALL return `422` problem+json. When a trip with the same `vehicle_id` and `end_time` already exists, the system SHALL return `409` problem+json whose `type` is the registry-defined `TRIP_CONFLICT` URI, detected by a dedicated validation step that runs before the handler (per the `request-validation` capability); the handler itself SHALL NOT catch a database unique-constraint violation, so a concurrent race that violates the `UNIQUE(vehicle_id, end_time)` constraint at insert time SHALL surface as an unhandled error. On any other unhandled error, the system SHALL return `500` problem+json with a constant `detail` (per the `error-handling` capability).

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

The system SHALL use dbmate for schema migrations. Migration SQL files SHALL live in `db/migrations/` with up and down scripts. A single initial migration SHALL create the `nanoid-postgres` extension, the `daypart_enum` and `location_enum` types, the `vehicles` and `trips` tables (with nanoid `TEXT` primary keys `DEFAULT nanoid(16)` from the outset, unit-free column names with SQL comments documenting each column's unit, and `start_location`/`end_location` as nullable `location_enum` columns — no `locations` table SHALL exist), plus dbmate's `schema_migrations` table. A seed migration SHALL insert a single default vehicle row (`description='commuter'`). Migrations SHALL be runnable locally via `bunx dbmate up`.

#### Scenario: Initial migration applies cleanly

- **GIVEN** an empty Postgres database (from docker-compose)
- **WHEN** `bunx dbmate up` is run
- **THEN** the `vehicles` and `trips` tables, the `daypart_enum` and `location_enum` types, the `nanoid-postgres` extension, and the `schema_migrations` table SHALL exist; no `locations` table SHALL exist

#### Scenario: Down migration rolls back

- **GIVEN** the initial migration has been applied
- **WHEN** `bunx dbmate down` is run
- **THEN** the `trips` and `vehicles` tables, the `daypart_enum` and `location_enum` types, and the nanoid functions SHALL be dropped (in correct FK order)

#### Scenario: Nanoid migration alters column types

- **GIVEN** the initial migration has been applied
- **WHEN** the `id` columns on `vehicles` and `trips` are inspected
- **THEN** the `id` columns SHALL be `TEXT DEFAULT nanoid(16)` from the outset (no separate UUID-to-nanoid migration exists); the FK column `vehicle_id` on `trips` SHALL be `TEXT`

#### Scenario: Column rename migration drops unit suffixes

- **GIVEN** the initial migration has been applied
- **WHEN** the `trips` table columns are inspected
- **THEN** the columns SHALL be named `duration`, `distance`, `speed`, `consumption`, and `odometer` from the outset (no separate rename migration exists), each carrying a SQL comment documenting its unit

#### Scenario: Column rename down migration restores suffixes

- **GIVEN** the initial migration has been applied
- **WHEN** the `trips` table is inspected
- **THEN** no unit-suffixed column names SHALL exist (the consolidated init migration creates unit-free names from the start; there is no rename migration to roll back)

#### Scenario: Seed migration inserts default vehicle

- **GIVEN** the initial migration has been applied
- **WHEN** the seed migration is applied
- **THEN** a single vehicle row with `description='commuter'` SHALL exist; no location rows SHALL be inserted

#### Scenario: Unit-free column names from the outset

- **GIVEN** the initial migration has been applied
- **WHEN** the `trips` table columns are inspected
- **THEN** the columns SHALL be named `duration`, `distance`, `speed`, `consumption`, and `odometer` (no unit-suffixed names), each carrying a SQL comment documenting its unit, and no intermediate rename migration SHALL exist

#### Scenario: Location enum columns on trips

- **GIVEN** the initial migration has been applied
- **WHEN** the `trips` table columns are inspected
- **THEN** `start_location` and `end_location` SHALL be nullable `location_enum` columns (type `home` or `work`); no `start_location_id` or `end_location_id` columns SHALL exist