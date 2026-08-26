## ADDED Requirements

### Requirement: Display timezone from environment

The system SHALL provide a pure function `displayTz` that returns the `DISPLAY_TZ` environment variable, defaulting to `"Europe/Copenhagen"` when unset. The function SHALL NOT access the database or consult location columns. The returned value SHALL be an IANA timezone string.

#### Scenario: DISPLAY_TZ set

- **GIVEN** `DISPLAY_TZ` is `"America/New_York"`
- **WHEN** `displayTz` is called
- **THEN** it SHALL return `"America/New_York"`

#### Scenario: DISPLAY_TZ unset falls back to Copenhagen

- **GIVEN** `DISPLAY_TZ` is unset
- **WHEN** `displayTz` is called
- **THEN** it SHALL return `"Europe/Copenhagen"`

#### Scenario: No location consultation

- **GIVEN** the system is running with any `DISPLAY_TZ` value
- **WHEN** `displayTz` is called
- **THEN** it SHALL NOT query the `locations` table and SHALL NOT read a `timezone` column

## MODIFIED Requirements

### Requirement: Current month bounds in UTC

The system SHALL provide a pure function `currentMonthBoundsUtc(zone, now)` that computes the inclusive start and exclusive end of the current calendar month in the given IANA `zone`, then converts both bounds to UTC Luxon `DateTime` instances (zone `UTC`). The start bound SHALL be the first day of the month at `00:00:00` in `zone`; the end bound SHALL be the first day of the next month at `00:00:00` in `zone`. Both SHALL be expressed as UTC `DateTime` instances suitable for timestamptz comparison via `.toISO()`. The function SHALL accept an optional `now` parameter for deterministic testing.

#### Scenario: Mid-month reference computes correct window

- **GIVEN** `zone` is `"Europe/Copenhagen"` and `now` is `2026-07-15T10:00:00 Europe/Copenhagen`
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL be a UTC `DateTime` representing `2026-06-30T22:00:00.000Z` (2026-07-01T00:00 Copenhagen = UTC+2) and the end SHALL be a UTC `DateTime` representing `2026-07-31T22:00:00.000Z` (2026-08-01T00:00 Copenhagen = UTC+2)

#### Scenario: Exclusive end excludes next month's first instant

- **GIVEN** a trip `end_time` of `2026-08-01T00:00:00 Europe/Copenhagen` (exactly the computed end bound) during a July query
- **WHEN** the trip is compared against the July window's exclusive end
- **THEN** the trip SHALL NOT be included in the window

#### Scenario: DST transition does not break boundary

- **GIVEN** `zone` is `"Europe/Copenhagen"` and `now` is `2026-03-20T12:00:00 Europe/Copenhagen` (after the March DST spring-forward)
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL be a UTC `DateTime` representing `2026-03-01T00:00:00 Europe/Copenhagen` converted to UTC and the end SHALL represent `2026-04-01T00:00:00 Europe/Copenhagen` converted to UTC, regardless of the DST offset shift mid-month

#### Scenario: UTC zone produces midnight bounds

- **GIVEN** `zone` is `"UTC"` and `now` is `2026-07-15T10:00:00Z`
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL be a UTC `DateTime` at `2026-07-01T00:00:00.000Z` and the end SHALL be a UTC `DateTime` at `2026-08-01T00:00:00.000Z`

## REMOVED Requirements

### Requirement: Display timezone resolution utility

**Reason**: The `resolveDisplayTz` function with its `end_location.timezone → start_location.timezone → fallback` chain is dead code — every caller passes `(undefined, undefined, DISPLAY_TZ)`. The `locations.timezone` column that fed the chain is being dropped. Replaced by the `displayTz` requirement above which reads `DISPLAY_TZ` directly.
**Migration**: Replace all `resolveDisplayTz(undefined, undefined, process.env.DISPLAY_TZ || "Europe/Copenhagen")` calls with `displayTz()`.
