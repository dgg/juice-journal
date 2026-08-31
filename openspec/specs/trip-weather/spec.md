# trip-weather

## Purpose

Captures weather conditions at a trip's start and end locations at the trip's start and end times, persisted into the trip's `weather_start` / `weather_end` JSONB columns on creation. Enables correlating ambient conditions (temperature, wind, precipitation) against trip consumption.

## Requirements

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

Each stored weather object SHALL conform to the shape: `{source, observed_at, fetched_at, weather_code, temperature, humidity, precipitation, wind}` where `source` is `forecast` or `historic`, `observed_at` is the bucket timestamp (ISO 8601 UTC), `fetched_at` is the request time (ISO 8601 UTC), `weather_code` is the integer WMO code, and each measurement (`temperature`, `humidity`, `precipitation`, `wind.speed`, `wind.direction`) is a plain `number | null`. Units SHALL NOT be carried in the stored payload; they are fixed per field and documented on the consuming type instead: `temperature` is degrees Celsius (`DEG_C`), `humidity` is percent (`PERCENT`), `precipitation` is millimetres (`MILLI-M`), `wind.speed` is metres per second (`M-PER-SEC`), and `wind.direction` is degrees (`DEG`).

#### Scenario: Well-formed weather object

- **GIVEN** the Open-Meteo response for the start bucket has `temperature_2m=13.5`, `relative_humidity_2m=80`, `precipitation=0.4`, `wind_speed_10m=7`, `wind_direction_10m=240`, `weather_code=3`
- **WHEN** the system persists `weather_start`
- **THEN** the stored JSON SHALL contain `temperature: 13.5`, `humidity: 80`, `precipitation: 0.4`, `wind: {speed: 7, direction: 240}`, `weather_code: 3`, `source: "forecast"`, and ISO 8601 UTC `observed_at` and `fetched_at`. No `u` field SHALL appear on any measurement.

#### Scenario: Null measurement stays null

- **GIVEN** the Open-Meteo response for a bucket has `temperature_2m=null` (missing/invalid reading)
- **WHEN** the system persists `weather_start`
- **THEN** the stored JSON SHALL contain `temperature: null` (not `{v: null, u: "DEG_C"}`)

#### Scenario: Start weather consumed by the trip row view

- **GIVEN** a trip has a non-null `weather_start` object conforming to the storage shape
- **WHEN** the trip row view is rendered
- **THEN** only the `weather_start` snapshot SHALL be displayed (the `weather_end` snapshot SHALL NOT be rendered in the trip row), and each measurement SHALL be displayed using its fixed unit: temperature as `°` (no unit text), humidity as `%`, precipitation as `mm`, wind speed as `m/s`, with `wind.direction` mapped to one of eight wind-origin cardinal classes

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

### Requirement: WMO weather code to icon category mapping

For display purposes the system SHALL collapse the integer WMO `weather_code` into one of eight categories — `clear`, `partly`, `overcast`, `fog`, `drizzle`, `rain`, `snow`, `thunder` — each mapped to a single `lucide-static` font icon class. The mapping SHALL be: `clear` (code 0) → `icon-sun`; `partly` (codes 1, 2) → `icon-cloud-sun`; `overcast` (code 3) → `icon-cloudy`; `fog` (codes 45, 48) → `icon-cloud-fog`; `drizzle` (codes 51, 53, 55, 56, 57) → `icon-cloud-drizzle`; `rain` (codes 61, 62, 63, 65, 66, 67, 80, 81, 82) → `icon-cloud-rain`; `snow` (codes 71, 73, 75, 77, 85, 86) → `icon-cloud-snow`; `thunder` (codes 95, 96, 99) → `icon-cloud-lightning`. Intensity distinctions between codes in the same category SHALL NOT be expressed via distinct icons; the precipitation `mm` value conveys intensity.

#### Scenario: Code maps to category icon

- **GIVEN** a start weather object has `weather_code = 61`
- **WHEN** the weather pill renders the WMO icon
- **THEN** the span SHALL use class `icon-cloud-rain`

#### Scenario: Unknown or null code renders a fallback icon

- **GIVEN** a start weather object has `weather_code = null` or a code outside the documented WMO set
- **WHEN** the weather pill renders the WMO icon
- **THEN** the span SHALL use a fallback `icon-thermometer-sun` class, and the pill SHALL still render the other measurements

### Requirement: Wind direction to rotation class mapping

For display purposes the system SHALL bin `wind.direction` (degrees, meteorological — the direction the wind blows **from**) into eight 45°-wide sectors and emit the corresponding `wind-from-*` CSS class on the `icon-mouse-pointer-2` span. Bins SHALL be centered on each cardinal/intercardinal direction: `wind-from-n` for `[337.5, 22.5)`, `wind-from-ne` for `[22.5, 67.5)`, `wind-from-e` for `[67.5, 112.5)`, `wind-from-se` for `[112.5, 157.5)`, `wind-from-s` for `[157.5, 202.5)`, `wind-from-sw` for `[202.5, 247.5)`, `wind-from-w` for `[247.5, 292.5)`, `wind-from-nw` for `[292.5, 337.5)`. The class name describes the wind's **origin** (where it blows from). The base `icon-mouse-pointer-2` glyph points up-left (north-west = 315°); the rendered arrow SHALL point in the direction the wind is **traveling toward** (i.e. origin + 180°), so each class applies a fixed clockwise `transform: rotate(...deg)` that rotates the native NW-pointing glyph to point downwind: `wind-from-se` = 0° (native, points NW = travel direction of a SE-origin wind), `wind-from-s` = 45°, `wind-from-sw` = 90°, `wind-from-w` = 135°, `wind-from-nw` = 180°, `wind-from-n` = 225°, `wind-from-ne` = 270°, `wind-from-e` = 315°.

#### Scenario: South-westerly wind maps to wind-from-sw

- **GIVEN** a start weather object has `wind.direction = 240`
- **WHEN** the weather pill renders the wind arrow
- **THEN** the span SHALL carry class `wind-from-sw` (240 falls in `[202.5, 247.5)`), and the CSS SHALL rotate the native NW-pointing glyph 90° clockwise so the arrow points north-east (the wind's travel direction, opposite its SW origin)

#### Scenario: Westerly wind arrow points east

- **GIVEN** a start weather object has `wind.direction = 270`
- **WHEN** the weather pill renders the wind arrow
- **THEN** the span SHALL carry class `wind-from-w` (270 falls in `[247.5, 292.5)`), and the CSS SHALL rotate the glyph 135° clockwise so the arrow points east — visually "the wind is blowing toward the east, coming from the west"

#### Scenario: North wind wraps the 360° boundary

- **GIVEN** a start weather object has `wind.direction = 350`
- **WHEN** the weather pill renders the wind arrow
- **THEN** the span SHALL carry class `wind-from-n` (350 falls in `[337.5, 360)`), and the CSS SHALL rotate the glyph 225° clockwise so the arrow points south (the wind's travel direction)

#### Scenario: South-easterly wind needs no rotation

- **GIVEN** a start weather object has `wind.direction = 140`
- **WHEN** the weather pill renders the wind arrow
- **THEN** the span SHALL carry class `wind-from-se` (140 falls in `[112.5, 157.5)`), and the CSS SHALL apply 0° rotation — the native NW-pointing glyph already points north-west, which is the travel direction of a SE-origin wind

#### Scenario: Null direction omits the arrow

- **GIVEN** a start weather object has `wind.direction = null`
- **WHEN** the weather pill renders
- **THEN** no `icon-mouse-pointer-2` span and no `wind-from-*` class SHALL be emitted