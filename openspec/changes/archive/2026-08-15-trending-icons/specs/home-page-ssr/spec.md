## MODIFIED Requirements

### Requirement: Month-over-month statistics comparison

The system SHALL display month-over-month comparisons for average consumption and average duration statistics. The home page is implicitly month-scoped, so the delta indicator suffix SHALL read `vs last month`.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

#### Scenario: Successful MoM comparison display

- **WHEN** user visits the home page and previous month data exists
- **THEN** system displays delta indicators comparing current month to previous month statistics, each with the suffix `vs last month` and a trend icon reflecting whether the current value is larger (`trending-up`), smaller (`trending-down`), or equal (`trending-up-down`) than the previous month

#### Scenario: Equal month-over-month value renders neutral trend icon

- **GIVEN** the current month average consumption equals the previous month average consumption
- **WHEN** the home page renders the average-consumption delta
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the suffix `vs last month`
