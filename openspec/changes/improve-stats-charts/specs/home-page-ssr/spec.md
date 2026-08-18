## MODIFIED Requirements

### Requirement: Month-over-month statistics comparison

The system SHALL display month-over-month comparison deltas for every stat card on the home page — total distance, total time driven, average speed, average duration, average consumption, and trip count.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

The delta indicator SHALL NOT render a unit suffix or a period-aware suffix. The home page is implicitly month-scoped, making a `vs last month` suffix redundant. The unit is already visible on the stat card's value, making a unit suffix on the delta redundant. The trend icon, the sign, the value, and the color class are sufficient.

For the total-time-driven and average-duration cards, the delta SHALL be computed from the raw minutes values (current minus previous), while the card's primary value remains the human-readable hours-and-minutes string. When either the current or previous value is null, the delta SHALL render the neutral/empty state with no trend icon, matching the stats page behavior.

#### Scenario: Successful MoM comparison display for all six stats

- **GIVEN** the current month and previous month both have trips for the displayed vehicle
- **WHEN** the user visits the home page
- **THEN** each of the six stat cards SHALL display a delta indicator comparing the current month to the previous month, with a trend icon reflecting whether the current value is larger (`trending-up`), smaller (`trending-down`), or equal (`trending-up-down`) than the previous month, with no unit suffix and no period-aware suffix

#### Scenario: Equal month-over-month value renders neutral trend icon

- **GIVEN** the current month average consumption equals the previous month average consumption
- **WHEN** the home page renders the average-consumption delta
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the value with no unit or period suffix

#### Scenario: Total time driven delta computed from minutes

- **GIVEN** the current month total `duration_min` is 377 and the previous month total `duration_min` is 300
- **WHEN** the home page renders the total-time-driven delta
- **THEN** the delta SHALL display `+77.0` with the appropriate trend icon, with no unit suffix and no period suffix, while the card's primary value remains the `6h 17m` human-readable string

#### Scenario: No previous-month data renders neutral deltas

- **GIVEN** the previous month has no trips for the displayed vehicle
- **WHEN** the user visits the home page
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta, with no trend icon, on all six cards
