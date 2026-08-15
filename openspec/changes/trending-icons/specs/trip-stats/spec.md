## MODIFIED Requirements

### Requirement: Previous-period deltas are shown for each stat

The system SHALL display a delta for each stat comparing the selected period to the previous equivalent period (previous ISO week, previous calendar month, previous calendar year), relative to the anchor date — not relative to the current date. When no `date` parameter is present, the delta SHALL compare the current period to the previous current period. The delta SHALL use the same delta-indicator pattern as the home page.

Each delta indicator SHALL render a period-aware suffix matching the selected period: `vs last week` for the week period, `vs last month` for the month period, and `vs last year` for the year period. The suffix SHALL NOT hard-code a single period; it SHALL change with the selected period.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

#### Scenario: Delta vs previous period for current period

- **GIVEN** current month total distance is 200 km and previous month total distance was 150 km
- **WHEN** the user views the current month period
- **THEN** the total-distance stat SHALL display an upward delta indicating +50 km versus the previous month, with a `trending-up` icon and the suffix `vs last month`

#### Scenario: Delta follows selected past period

- **GIVEN** July 2026 total distance is 180 km and June 2026 total distance was 220 km
- **WHEN** the user views July 2026 (`date=2026-07`)
- **THEN** the total-distance stat SHALL display a downward delta indicating -40 km versus June 2026, with a `trending-down` icon and the suffix `vs last month`

#### Scenario: Delta suffix matches the selected period

- **GIVEN** the user is viewing the week period and the year period in turn
- **WHEN** the delta indicator renders for the week period
- **THEN** the suffix SHALL read `vs last week`
- **AND WHEN** the delta indicator renders for the year period
- **THEN** the suffix SHALL read `vs last year`
- **AND WHEN** the delta indicator renders for the month period
- **THEN** the suffix SHALL read `vs last month`

#### Scenario: Trend icon reflects equal current and previous values

- **GIVEN** the current period total distance equals the previous period total distance
- **WHEN** the delta indicator renders
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the period-aware suffix

#### Scenario: No previous-period data

- **GIVEN** the previous period relative to the anchor has no trips
- **WHEN** the user views the selected period
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta, with no trend icon
