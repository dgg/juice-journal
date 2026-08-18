## MODIFIED Requirements

### Requirement: Stats values are aggregated for the selected period

For the selected period the system SHALL display: total distance (km, sum of `distance_km`), total time driven (sum of `duration_min` rendered as a human-readable `xh ym` string, e.g. `6h 17m`, `45m`, `2h`), average speed (km/h, arithmetic mean of per-trip `avg_speed_kmh` over trips that have a non-null value), average duration (arithmetic mean of `duration_min`), average consumption (kWh/100km, arithmetic mean of `avg_consumption_kwh_100km` over trips that have a non-null value), and trip count. Values SHALL be null when no trips exist in the period.

The average-duration stat card SHALL display the duration as a human-readable hours-and-minutes string (e.g., `1h 30m`, `45m`, `2h`) as its primary value, and the unit slot for that card SHALL be empty. The raw minutes number SHALL NOT be rendered alongside the hours-and-minutes string. When the duration is null, the card SHALL render `--` with no unit, matching the empty-period behavior of the other stats.

The total-time-driven stat card SHALL display the total as a human-readable hours-and-minutes string using the same formatting rules as the average-duration card (`xh ym` when both components are non-zero, `xh` when minutes are zero, `ym` when hours are zero, `--` with no unit when null). The raw minutes number SHALL NOT be rendered alongside the hours-and-minutes string.

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

#### Scenario: Total time driven displays as hours and minutes

- **GIVEN** trips in the current month with total `duration_min` of 377
- **WHEN** the user views the month period
- **THEN** the total-time-driven stat card SHALL display `6h 17m` as its value with no unit suffix, and the raw minutes number (`377`) SHALL NOT appear in the card

#### Scenario: Total time driven under one hour displays minutes only

- **GIVEN** trips in the current month with total `duration_min` of 45
- **WHEN** the user views the month period
- **THEN** the total-time-driven stat card SHALL display `45m` with no unit suffix

#### Scenario: Total time driven is a whole number of hours

- **GIVEN** trips in the current month with total `duration_min` of 120
- **WHEN** the user views the month period
- **THEN** the total-time-driven stat card SHALL display `2h` with no unit suffix

#### Scenario: Null stats for empty period

- **GIVEN** no trips in the current week
- **WHEN** the user views the week period
- **THEN** total distance, total time driven, average speed, average duration, average consumption, and trip count SHALL render as a dash/empty state rather than zero, and the average-duration and total-time cards SHALL render `--` with no unit suffix

### Requirement: Charts are hidden on phone-sized viewports

The system SHALL hide the chart canvases on phone-sized viewports via CSS and SHALL keep the stats cards (totals, deltas, trip count) and the period switcher visible. The year-granularity toggle SHALL also be hidden on phone-sized viewports, since it only affects chart bucketing and is meaningless without the charts. Charts and the year-granularity toggle remain rendered on tablet and desktop widths. The page is still reachable at `/stats` on phone; the chart region and year-granularity toggle are suppressed.

#### Scenario: Phone hides charts and year granularity, keeps stats

- **WHEN** the user views `/stats` on a viewport narrower than the tablet breakpoint
- **THEN** the stats cards, period switcher, and period navigation control SHALL remain visible, and both the chart region and the year-granularity toggle SHALL be hidden

#### Scenario: Tablet/desktop shows charts and year granularity

- **WHEN** the user views `/stats` on a viewport at or above the tablet breakpoint
- **THEN** the chart region and the year-granularity toggle (when the period is year) SHALL render alongside the stats cards

### Requirement: Year period charts are bucketed with a granularity toggle

For the year period the system SHALL NOT render one bar per trip. It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. Each bucket bar SHALL represent the sum of distance and duration (chart 1) and the arithmetic mean of speed and consumption (chart 2) over the trips in that bucket. The granularity toggle SHALL render one button per value; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system, matching the period switcher mapping: `month` → `calendar-days`, `week` → `calendar-1`.

The granularity toggle SHALL render directly above the chart region, not at the top of the stats region, because it only affects chart bucketing and has no effect on the stat cards. Moving the toggle adjacent to the charts makes the causal relationship between the control and its effect visible.

#### Scenario: Year with month granularity (default)

- **GIVEN** the selected period is year and `yearGranularity` is unset or `month`
- **WHEN** the charts render
- **THEN** each chart SHALL show at most 12 bars, one per calendar month, each summarizing that month's trips

#### Scenario: Year with week granularity

- **GIVEN** the selected period is year and `yearGranularity` is `week`
- **WHEN** the charts render
- **THEN** each chart SHALL show one bar per ISO week (up to 53), each summarizing that week's trips

#### Scenario: Toggling year granularity

- **WHEN** the user toggles between Month and Week granularity while the period is year
- **THEN** the system SHALL request `/partials/trip-stats?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label

#### Scenario: Granularity toggle sits above the chart region

- **GIVEN** the selected period is year and the viewport is at or above the tablet breakpoint
- **WHEN** the stats region renders
- **THEN** the year-granularity toggle SHALL appear directly above the chart canvases and below the stat cards, not between the period switcher and the period navigation control

## ADDED Requirements

### Requirement: Stats cards render in a responsive hero + grid layout

The stats cards SHALL render in a two-tier layout on the stats page: a hero tier and a secondary grid tier. The hero tier SHALL contain exactly two cards — total distance and total time driven — styled with the hero treatment used on the home page (larger value font, primary color, larger padding). The secondary grid tier SHALL contain the remaining cards: average speed, average duration, average consumption, and trip count.

On phone-sized viewports the hero cards SHALL each span the full content width and stack vertically (one hero per row). The secondary cards SHALL render in a two-column grid.

On tablet and desktop viewports the two hero cards SHALL share a single row (two equal columns). The four secondary cards SHALL render in a single row of four equal columns. The layout SHALL use horizontal real estate to reduce vertical scrolling on wider viewports, and SHALL degrade gracefully to stacked/2-column layouts on narrower viewports.

#### Scenario: Phone renders stacked heroes and a 2-column secondary grid

- **WHEN** the stats page renders on a viewport narrower than the tablet breakpoint
- **THEN** the total-distance and total-time-driven hero cards SHALL each occupy the full content width and stack vertically, and the average-speed, average-duration, average-consumption, and trip-count cards SHALL render in a two-column grid

#### Scenario: Desktop renders heroes in one row and secondaries in a four-column row

- **WHEN** the stats page renders on a viewport at or above the tablet breakpoint
- **THEN** the two hero cards SHALL render side by side in a single row of two equal columns, and the four secondary cards SHALL render side by side in a single row of four equal columns

#### Scenario: Hero cards use the home-page hero treatment

- **GIVEN** the stats page renders with at least one trip in the period
- **WHEN** the hero cards render
- **THEN** the hero cards SHALL apply the same hero styling as the home page (larger value font, primary color, larger padding) and SHALL be visually distinguishable from the secondary cards

#### Scenario: Empty period renders hero and secondary cards in the same layout

- **GIVEN** the selected period has no trips
- **WHEN** the stats region renders
- **THEN** the hero + grid layout SHALL still render with all six card slots in their responsive positions, each displaying the empty `--` state

### Requirement: Navigation widgets use natural width and center on desktop

The period switcher, the year-granularity toggle, and the period navigation control SHALL NOT stretch their buttons to fill the full container width on tablet and desktop viewports. Each widget SHALL size its buttons to their natural content width and center the widget horizontally within the container. On phone-sized viewports the period switcher buttons MAY continue to stretch to the full container width to keep the segmented-control tap target large, but the period navigation control SHALL keep its picker centered with natural-width stepper buttons at all viewport sizes.

#### Scenario: Desktop period switcher does not stretch to container edges

- **GIVEN** the user views `/stats` on a viewport at or above the tablet breakpoint
- **WHEN** the period switcher renders
- **THEN** the switcher buttons SHALL size to their natural content width and the switcher SHALL be centered horizontally within the container, leaving horizontal margin on both sides rather than expanding to the container edges

#### Scenario: Desktop year-granularity toggle does not stretch to container edges

- **GIVEN** the user views `/stats` with period=year on a viewport at or above the tablet breakpoint
- **WHEN** the year-granularity toggle renders above the chart region
- **THEN** the toggle buttons SHALL size to their natural content width and the toggle SHALL be centered horizontally within the container

#### Scenario: Period navigation control keeps natural-width steppers at all sizes

- **WHEN** the period navigation control renders at any viewport width
- **THEN** the ◀ and ▶ stepper buttons SHALL size to their natural content width and the picker SHALL remain centered, without the stepper buttons stretching to consume available width

#### Scenario: Phone period switcher may stretch for tap target

- **WHEN** the user views `/stats` on a viewport narrower than the tablet breakpoint
- **THEN** the period switcher buttons MAY stretch to fill the container width to preserve a large tap target, consistent with the segmented-control pattern
