## MODIFIED Requirements

### Requirement: Stats values are aggregated for the selected period

For the selected period the system SHALL display: total distance (km, sum of `distance_km`), average speed (km/h, arithmetic mean of per-trip `avg_speed_kmh` over trips that have a non-null value), average duration (arithmetic mean of `duration_min`), average consumption (kWh/100km, arithmetic mean of `avg_consumption_kwh_100km` over trips that have a non-null value), and trip count. Values SHALL be null when no trips exist in the period.

The average-duration stat card SHALL display the duration as a human-readable hours-and-minutes string (e.g., `1h 30m`, `45m`, `2h`) as its primary value, and the unit slot for that card SHALL be empty. The raw minutes number SHALL NOT be rendered alongside the hours-and-minutes string. When the duration is null, the card SHALL render `--` with no unit, matching the empty-period behavior of the other stats.

#### Scenario: Aggregates with trips in period

- **GIVEN** three trips in the current month with `avg_speed_kmh` of 40, 50, 60
- **WHEN** the user views the month period
- **THEN** the average speed SHALL display as 50 km/h and the trip count SHALL display as 3

#### Scenario: Average duration displays as hours and minutes

- **GIVEN** trips in the current month with an average `duration_min` of 90
- **WHEN** the user views the month period
- **THEN** the average-duration stat card SHALL display `1h 30m` as its value and SHALL NOT display a unit suffix, and the raw minutes number (`90`) SHALL NOT appear in the card

#### Scenario: Average duration under one hour displays minutes only

- **GIVEN** trips in the current month with an average `duration_min` of 30
- **WHEN** the user views the month period
- **THEN** the average-duration stat card SHALL display `30m` as its value with no unit suffix

#### Scenario: Average duration is a whole number of hours

- **GIVEN** trips in the current month with an average `duration_min` of 120
- **WHEN** the user views the month period
- **THEN** the average-duration stat card SHALL display `2h` as its value with no unit suffix

#### Scenario: Null stats for empty period

- **GIVEN** no trips in the current week
- **WHEN** the user views the week period
- **THEN** total distance, average speed, average duration, average consumption, and trip count SHALL render as a dash/empty state rather than zero, and the average-duration card SHALL render `--` with no unit suffix
