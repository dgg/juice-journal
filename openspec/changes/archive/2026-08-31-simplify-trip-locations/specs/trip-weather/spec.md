## MODIFIED Requirements

### Requirement: Weather recorded on trip creation

When a trip is created (via REST `POST /api/trips` or the HTMX form submit), the system SHALL attempt to fetch and persist weather conditions for the start location at `start_time` and the end location at `end_time` before returning the response. Fetching SHALL be funneled through the trip-creation query path so all creation entry points inherit the behavior. Location coordinates SHALL be resolved from the `HOME_LATLNG` and `WORK_LATLNG` environment variables (comma-separated `latitude,longitude`) based on the trip's `start_location` and `end_location` enum values — no database lookup for coordinates SHALL occur (the `locations` table does not exist).

#### Scenario: Fresh commute with both locations

- **GIVEN** a trip is created with `start_location='home'` and `end_location='work'`, `HOME_LATLNG` and `WORK_LATLNG` are set, and `start_time` / `end_time` are within the last 7 days
- **WHEN** the trip is saved
- **THEN** the system SHALL populate `weather_start` with conditions at the `HOME_LATLNG` coordinates nearest `start_time`, and `weather_end` with conditions at the `WORK_LATLNG` coordinates nearest `end_time`, both via the Open-Meteo `/forecast` endpoint

#### Scenario: Trip older than 7 days

- **GIVEN** a trip is created with `end_time` more than 7 days before now
- **WHEN** the system fetches weather
- **THEN** the system SHALL use the Open-Meteo `/archive` endpoint for both start and end conditions

#### Scenario: Null location skips weather silently

- **GIVEN** a trip is created with `start_location` = NULL and/or `end_location` = NULL
- **WHEN** the trip is saved
- **THEN** the corresponding `weather_start` and/or `weather_end` SHALL be NULL, no weather fetch SHALL occur for the missing side, and no warning SHALL be logged for the skip

#### Scenario: Missing env var fails fast

- **GIVEN** a trip is created with `start_location='home'` and `HOME_LATLNG` is not set in the environment
- **WHEN** the system attempts to resolve the start location coordinates
- **THEN** the system SHALL throw a configuration error before any weather fetch is attempted; the trip SHALL NOT be persisted with silently-wrong (0,0) coordinates

## ADDED Requirements

### Requirement: Location coordinates from environment variables

The system SHALL resolve geographic coordinates for weather fetching from two environment variables: `HOME_LATLNG` (comma-separated `latitude,longitude` for the "home" location) and `WORK_LATLNG` (comma-separated `latitude,longitude` for the "work" location). This follows the existing `DISPLAY_TZ` environment-variable precedent for deployment-specific configuration. The variables SHALL be parsed at runtime when a trip with a non-null location is created; the system SHALL NOT cache stale values across process restarts. If a referenced location's env var is unset or malformed, the system SHALL fail fast with a configuration error rather than silently defaulting to (0,0).

#### Scenario: HOME_LATLNG parsed correctly

- **GIVEN** `HOME_LATLNG=55.676098,12.568337`
- **WHEN** a trip with `start_location='home'` is created
- **THEN** the system SHALL resolve latitude `55.676098` and longitude `12.568337` for the weather fetch

#### Scenario: Missing HOME_LATLNG fails fast

- **GIVEN** `HOME_LATLNG` is unset
- **WHEN** a trip with `start_location='home'` is created
- **THEN** the system SHALL throw an error indicating `HOME_LATLNG` is not set, and SHALL NOT proceed with a (0,0) fallback

#### Scenario: Malformed WORK_LATLNG fails fast

- **GIVEN** `WORK_LATLNG=not-a-coordinate`
- **WHEN** a trip with `end_location='work'` is created
- **THEN** the system SHALL throw an error indicating `WORK_LATLNG` is malformed, and SHALL NOT proceed with the weather fetch

#### Scenario: Null location does not require env var

- **GIVEN** `HOME_LATLNG` and `WORK_LATLNG` are both unset
- **WHEN** a trip with `start_location=NULL` and `end_location=NULL` is created
- **THEN** the system SHALL NOT attempt to resolve coordinates, SHALL NOT throw, and SHALL persist the trip with NULL weather columns