## MODIFIED Requirements

### Requirement: GET /api/trips endpoint (current month)

The system SHALL expose `GET /api/trips` returning trips for the current calendar month in the display timezone. Display timezone SHALL be resolved via the `date-handling` capability's `resolveDisplayTz` using the fallback chain: `end_location.timezone` → `start_location.timezone` → app config default (`DISPLAY_TZ`, default `Europe/Copenhagen`). Month bounds SHALL be computed via the `date-handling` capability's `currentMonthBoundsUtc` as inclusive start / exclusive end in UTC. The response SHALL be `200 OK` with a JSON array of trip objects, sorted by `end_time` descending. If no trips exist, the response SHALL be an empty array.

#### Scenario: Trips exist in current month

- **GIVEN** two trips exist with `end_time` in the current calendar month (display tz) and one trip exists in a previous month
- **WHEN** a `GET /api/trips` request is sent
- **THEN** the system SHALL return `200` with an array of two trips, sorted by `end_time` descending, excluding the previous-month trip

#### Scenario: No trips in current month

- **GIVEN** no trips exist in the current calendar month
- **WHEN** a `GET /api/trips` request is sent
- **THEN** the system SHALL return `200` with an empty array `[]`

#### Scenario: Timezone boundary at month edge

- **GIVEN** a trip with `end_time` at 23:59 on the last day of the month in `Europe/Copenhagen` (which is 21:59 or 22:59 UTC depending on DST)
- **WHEN** a `GET /api/trips` request is sent during that month
- **THEN** the trip SHALL be included in the response
