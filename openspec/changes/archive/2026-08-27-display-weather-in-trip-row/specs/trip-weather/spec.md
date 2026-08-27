## MODIFIED Requirements

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