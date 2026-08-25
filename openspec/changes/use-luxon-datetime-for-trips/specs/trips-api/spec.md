## ADDED Requirements

### Requirement: Display timezone from environment variable

The system SHALL resolve the display timezone for month-boundary computation via the `date-handling` capability's `displayTz` function, which returns the `DISPLAY_TZ` environment variable (default `Europe/Copenhagen`). The system SHALL NOT consult location columns for timezone resolution. All stored timestamps SHALL be in UTC; only display and month-boundary computation uses the resolved timezone.

#### Scenario: DISPLAY_TZ used for boundary computation

- **GIVEN** `DISPLAY_TZ=Europe/Copenhagen`
- **WHEN** the current month is computed
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

#### Scenario: DISPLAY_TZ unset defaults to Copenhagen

- **GIVEN** `DISPLAY_TZ` is unset
- **WHEN** the current month is computed
- **THEN** the system SHALL use `Europe/Copenhagen` for boundary computation

## MODIFIED Requirements

### Requirement: Locations table

The system SHALL maintain a `locations` table storing commute endpoints with `id` (16-character nanoid generated in Postgres via `nanoid-postgres`, `DEFAULT nanoid(16)`), `label` (text), `latitude` (`DECIMAL(9,6)`), `longitude` (`DECIMAL(9,6)`), and audit columns. Both `latitude` and `longitude` MUST be within valid ranges (-90 to 90, -180 to 180). The legacy `timezone` column SHALL be removed.

#### Scenario: Location with valid coordinates

- **GIVEN** the database is initialized
- **WHEN** a location is created with `latitude=55.676098` and `longitude=12.568337`
- **THEN** the system SHALL store the location and accept it as a reference from a trip

#### Scenario: Location referenced as trip start or end

- **GIVEN** a location exists
- **WHEN** a trip is created with `start_location_id` or `end_location_id` referencing that location
- **THEN** the trip SHALL store the foreign key; the location row SHALL NOT carry a `timezone` column

### Requirement: GET /api/trips endpoint (current month)

The system SHALL expose `GET /api/trips` returning trips for the current calendar month in the display timezone. Display timezone SHALL be resolved via the `date-handling` capability's `displayTz` (returns `DISPLAY_TZ`, default `Europe/Copenhagen`). Month bounds SHALL be computed via the `date-handling` capability's `currentMonthBoundsUtc` as inclusive start / exclusive end in UTC, returned as UTC `DateTime` instances; the query layer SHALL serialize them to ISO strings for the SQL comparison. The response SHALL be `200 OK` with a JSON array of trip objects, sorted by `end_time` descending. If no trips exist, the response SHALL be an empty array.

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

## REMOVED Requirements

### Requirement: Display timezone resolution

**Reason**: The fallback chain `end_location.timezone → start_location.timezone → DISPLAY_TZ` is dead — every caller passes `(undefined, undefined, DISPLAY_TZ)`. Replaced by the ADDED requirement above which uses `displayTz()` directly.
**Migration**: Callers switch from `resolveDisplayTz(undefined, undefined, fallback)` to `displayTz()`. No observable behavior change (the fallback was already the only effective path).
