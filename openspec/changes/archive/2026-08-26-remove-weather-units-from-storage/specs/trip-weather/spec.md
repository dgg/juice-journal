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