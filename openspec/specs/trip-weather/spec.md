# trip-weather

## Purpose

Captures weather conditions at a trip's start and end locations at the trip's start and end times, persisted into the trip's `weather_start` / `weather_end` JSONB columns on creation. Enables correlating ambient conditions (temperature, wind, precipitation) against trip consumption.

## Requirements

### Requirement: Weather recorded on trip creation

When a trip is created (via REST `POST /api/trips` or the HTMX form submit), the system SHALL attempt to fetch and persist weather conditions for the start location at `start_time` and the end location at `end_time` before returning the response. Fetching SHALL be funneled through the trip-creation query path so all creation entry points inherit the behavior.

#### Scenario: Fresh commute with both locations

- **GIVEN** a trip is created with `start_location_id` and `end_location_id` referencing existing locations, and `start_time` / `end_time` are within the last 7 days
- **WHEN** the trip is saved
- **THEN** the system SHALL populate `weather_start` with conditions at the start location nearest `start_time`, and `weather_end` with conditions at the end location nearest `end_time`, both via the Open-Meteo `/forecast` endpoint

#### Scenario: Trip older than 7 days

- **GIVEN** a trip is created with `end_time` more than 7 days before now
- **WHEN** the system fetches weather
- **THEN** the system SHALL use the Open-Meteo `/archive` endpoint for both start and end conditions

#### Scenario: Null location skips weather silently

- **GIVEN** a trip is created with `start_location_id` = NULL and/or `end_location_id` = NULL
- **WHEN** the trip is saved
- **THEN** the corresponding `weather_start` and/or `weather_end` SHALL be NULL, no weather fetch SHALL occur for the missing side, and no warning SHALL be logged for the skip

### Requirement: Endpoint selection by trip age

The system SHALL select the Open-Meteo endpoint based on the age of `end_time` relative to now: `age <= 7 days` → `/forecast`; `age > 7 days` → `/archive`. For the `/forecast` call, the system SHALL request `models=dmi_harmonie_arome_europe`. For the `/archive` call, the system SHALL NOT pin a model (use the default reanalysis). The system SHALL request only `hourly` parameters (no `current=`) and select the bucket nearest each trip timestamp.

#### Scenario: Forecast used for recent trip

- **GIVEN** a trip with `end_time` 2 hours ago
- **WHEN** the system builds the Open-Meteo request
- **THEN** the request URL SHALL target `/v1/forecast` with `models=dmi_harmonie_arome_europe`, `past_hours` sized to cover `now - start_time`, and `hourly` parameters for the recorded fields

#### Scenario: Archive used for old trip

- **GIVEN** a trip with `end_time` 30 days ago
- **WHEN** the system builds the Open-Meteo request
- **THEN** the request URL SHALL target the archive endpoint without `models`, with `start_date` and `end_date` covering the trip's date, and `hourly` parameters for the recorded fields

### Requirement: Hourly bucket selection

The system SHALL select, for each trip side (start, end), the hourly bucket whose timestamp is closest to the trip's `start_time` / `end_time`. The selected bucket's timestamp SHALL be recorded as `observed_at` in the stored weather object.

#### Scenario: Nearest bucket chosen

- **GIVEN** a trip with `start_time` at 08:23 and the Open-Meteo response contains hourly buckets at 08:00 and 09:00
- **WHEN** the system selects the start bucket
- **THEN** the system SHALL pick the 08:00 bucket (nearest to 08:23) and store its timestamp as `observed_at`

### Requirement: Weather storage shape

Each stored weather object SHALL conform to the shape: `{source, observed_at, fetched_at, weather_code, temperature, humidity, precipitation, wind}` where `source` is `forecast` or `historic`, `observed_at` is the bucket timestamp (ISO 8601 UTC), `fetched_at` is the request time (ISO 8601 UTC), `weather_code` is the integer WMO code, and each measurement (`temperature`, `humidity`, `precipitation`, `wind.speed`, `wind.direction`) is an object `{v: number, u: string}` where `u` is a QUDT unit string (`DEG_C`, `PERCENT`, `MILLI-M`, `M-PER-SEC`, `DEG`).

#### Scenario: Well-formed weather object

- **GIVEN** the Open-Meteo response for the start bucket has `temperature_2m=13.5`, `relative_humidity_2m=80`, `precipitation=0.4`, `wind_speed_10m=7`, `wind_direction_10m=240`, `weather_code=3`
- **WHEN** the system persists `weather_start`
- **THEN** the stored JSON SHALL contain `temperature: {v: 13.5, u: "DEG_C"}`, `humidity: {v: 80, u: "PERCENT"}`, `precipitation: {v: 0.4, u: "MILLI-M"}`, `wind: {speed: {v: 7, u: "M-PER-SEC"}, direction: {v: 240, u: "DEG"}}}`, `weather_code: 3`, `source: "forecast"`, and ISO 8601 UTC `observed_at` and `fetched_at`

### Requirement: Hybrid retry on fetch failure

The system SHALL first attempt the weather fetch synchronously during the save. If the fetch fails, the system SHALL still persist the trip with `NULL` weather and schedule up to 2 asynchronous retries (first at +5s, second at +30s after the first retry). After 3 total failures (sync + 2 async), the system SHALL leave the weather `NULL` and take no further automatic action. Each failure SHALL be logged at `warn` level.

#### Scenario: Sync fetch succeeds

- **GIVEN** a trip is created and Open-Meteo responds within the sync fetch window
- **WHEN** the save returns
- **THEN** the trip SHALL be persisted with non-null `weather_start` and `weather_end` (where locations exist), no retry SHALL be scheduled, and the response SHALL return 201

#### Scenario: Sync fails, async retry succeeds

- **GIVEN** a trip is created and the sync weather fetch fails
- **WHEN** the save returns
- **THEN** the trip SHALL be persisted with `NULL` weather, the response SHALL return 201, a first retry SHALL be scheduled at +5s; if the first retry succeeds the trip's weather columns SHALL be updated in place and no further retry SHALL fire

#### Scenario: All three attempts fail

- **GIVEN** a trip is created and Open-Meteo is unavailable across the sync fetch and both async retries
- **WHEN** the second async retry fails
- **THEN** the trip SHALL remain with `NULL` weather, the failure SHALL be logged at `warn`, and no further automatic fetch SHALL occur for that trip

### Requirement: Trip save not blocked by weather

The trip record is the primary artifact; weather is enrichment. The system SHALL NOT fail the trip creation response due to a weather fetch failure. The 201 response SHALL be returned regardless of whether the weather fetch succeeded, failed, or was skipped due to a null location.

#### Scenario: Weather outage does not lose trip

- **GIVEN** Open-Meteo is completely unreachable (timeout, 5xx, network error) when a trip is created
- **WHEN** the save completes
- **THEN** the trip SHALL be persisted with `NULL` weather and the response SHALL return 201 with the full trip record