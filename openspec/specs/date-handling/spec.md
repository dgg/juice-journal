# Date Handling Specification

## Purpose

Provides Luxon-based utilities for display-timezone resolution and calendar-month boundary computation in UTC. These utilities are consumed by trip-listing and date-dependent operations to ensure correct month windows across timezones and DST transitions.

## Requirements

### Requirement: Display timezone resolution utility

The system SHALL provide a pure function `resolveDisplayTz` that resolves the display timezone using the fallback chain `end_location.timezone` → `start_location.timezone` → provided fallback (default `Europe/Copenhagen`). The function SHALL NOT access the database. The returned value SHALL be an IANA timezone string. The function SHALL return the fallback when a provided location timezone is `null`, `undefined`, or empty.

#### Scenario: End location timezone takes priority

- **GIVEN** `endLocationTz` is `"Europe/Copenhagen"` and `startLocationTz` is `"UTC"`
- **WHEN** `resolveDisplayTz` is called with these arguments
- **THEN** it SHALL return `"Europe/Copenhagen"`

#### Scenario: Start location timezone used when end missing

- **GIVEN** `endLocationTz` is `null` and `startLocationTz` is `"America/New_York"`
- **WHEN** `resolveDisplayTz` is called
- **THEN** it SHALL return `"America/New_York"`

#### Scenario: Fallback used when both locations missing

- **GIVEN** `endLocationTz` is `null` and `startLocationTz` is `null`
- **WHEN** `resolveDisplayTz` is called with fallback `"Europe/Copenhagen"`
- **THEN** it SHALL return `"Europe/Copenhagen"`

#### Scenario: Empty string treated as missing

- **GIVEN** `endLocationTz` is `""` and `startLocationTz` is `""`
- **WHEN** `resolveDisplayTz` is called with fallback `"Europe/Copenhagen"`
- **THEN** it SHALL return `"Europe/Copenhagen"`

### Requirement: Current month bounds in UTC

The system SHALL provide a pure function `currentMonthBoundsUtc(zone, now)` that computes the inclusive start and exclusive end of the current calendar month in the given IANA `zone`, then converts both bounds to UTC ISO 8601 strings. The start bound SHALL be the first day of the month at `00:00:00` in `zone`; the end bound SHALL be the first day of the next month at `00:00:00` in `zone`. Both SHALL be expressed as UTC ISO strings suitable for timestamptz comparison. The function SHALL accept an optional `now` parameter for deterministic testing.

#### Scenario: Mid-month reference computes correct window

- **GIVEN** `zone` is `"Europe/Copenhagen"` and `now` is `2026-07-15T10:00:00 Europe/Copenhagen`
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL be `2026-06-30T22:00:00.000Z` (2026-07-01T00:00 Copenhagen = UTC+2) and the end SHALL be `2026-07-31T22:00:00.000Z` (2026-08-01T00:00 Copenhagen = UTC+2)

#### Scenario: Exclusive end excludes next month's first instant

- **GIVEN** a trip `end_time` of `2026-08-01T00:00:00 Europe/Copenhagen` (exactly the computed end bound) during a July query
- **WHEN** the trip is compared against the July window's exclusive end
- **THEN** the trip SHALL NOT be included in the window

#### Scenario: DST transition does not break boundary

- **GIVEN** `zone` is `"Europe/Copenhagen"` and `now` is `2026-03-20T12:00:00 Europe/Copenhagen` (after the March DST spring-forward)
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL represent `2026-03-01T00:00:00 Europe/Copenhagen` converted to UTC and the end SHALL represent `2026-04-01T00:00:00 Europe/Copenhagen` converted to UTC, regardless of the DST offset shift mid-month

#### Scenario: UTC zone produces midnight bounds

- **GIVEN** `zone` is `"UTC"` and `now` is `2026-07-15T10:00:00Z`
- **WHEN** `currentMonthBoundsUtc` is called
- **THEN** the start SHALL be `2026-07-01T00:00:00.000Z` and the end SHALL be `2026-08-01T00:00:00.000Z`
