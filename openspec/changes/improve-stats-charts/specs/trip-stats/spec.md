## MODIFIED Requirements

### Requirement: Two dual-axis charts render the current period only

The system SHALL render exactly two charts for the current period (never the previous period):

1. A **distance + duration bar chart** with distance (km) on the left y-axis and duration (min) on the right y-axis. Bars SHALL have rounded corners (`borderRadius`), a vertical gradient fill (top lighter, bottom richer, derived from the dataset's hue family), and a 1px border in the hue family's darker shade. The chart SHALL display a soft horizontal grid (`grid.color` at low alpha, ~0.06) on the left y-axis only; the right y-axis SHALL keep `grid.drawOnChartArea: false` so the two grids do not compete.
2. A **speed + consumption line chart** with speed (km/h) on the left y-axis and consumption (kWh/100km) on the right y-axis. Both series SHALL render as lines (no fill, no bars), each in a distinct hue family (amber for speed, jade for consumption), with `tension` > 0 for a gentle curve. The chart SHALL display a soft horizontal grid on the left y-axis only; the right y-axis SHALL keep `grid.drawOnChartArea: false`.

Both charts SHALL use Chart.js, loaded only on the stats page. The chart-region markup (`#stats-charts`, `#stats-data`, the two `<canvas>` elements, the period switcher, and the year-granularity toggle) SHALL remain unchanged; only the chart construction in the init scripts changes.

#### Scenario: Per-trip charts for week and month

- **GIVEN** the selected period is week or month
- **WHEN** the charts render
- **THEN** the distance + duration chart SHALL show one bar per trip in the period, ordered by `end_time` ascending, each bar carrying a rounded-corner, gradient fill, and 1px border
- **AND** the speed + consumption chart SHALL show one point per trip on each of the two lines (speed and consumption), ordered by `end_time` ascending

#### Scenario: Dual y-axes present

- **WHEN** either chart renders
- **THEN** the chart SHALL display two y-axes with distinct units and scale the two series independently, with the right y-axis grid suppressed to avoid double-grid noise

#### Scenario: Distance + duration bars carry gradient fill and rounded corners

- **GIVEN** the selected period is week, month, or year with at least one trip
- **WHEN** the distance + duration chart renders
- **THEN** each bar SHALL have rounded corners and a vertical gradient fill whose top stop is lighter (higher lightness) than its bottom stop, both stops drawn from the same hue family (slate for distance, pink for duration), and the chart SHALL display a soft horizontal grid on the left y-axis only

#### Scenario: Speed + consumption chart renders as lines, not bars

- **GIVEN** the selected period is week, month, or year with at least one trip
- **WHEN** the speed + consumption chart renders
- **THEN** the speed series SHALL render as an amber line with no bars and no area fill, and the consumption series SHALL render as a jade line with no bars and no area fill, both with `tension` > 0

#### Scenario: Legend is condensed and labeled

- **WHEN** either chart renders
- **THEN** the legend SHALL render as a single row at the top of the chart, with two items for chart 1 and two items for chart 2

### Requirement: Year period charts are bucketed with a granularity toggle

For the year period the system SHALL NOT render one bar per trip (chart 1) or one point per trip (chart 2). It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. For chart 1, each bucket bar SHALL represent the sum of distance and duration over the trips in that bucket. For chart 2, each bucket SHALL contribute one point per line (speed and consumption) computed as the arithmetic mean of the per-trip values over the trips in that bucket. The granularity toggle SHALL render one button per value; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system, matching the period switcher mapping: `month` → `calendar-days`, `week` → `calendar-1`.

The granularity toggle SHALL render directly above the chart region, not at the top of the stats region, because it only affects chart bucketing and has no effect on the stat cards. Moving the toggle adjacent to the charts makes the causal relationship between the control and its effect visible.

#### Scenario: Year with month granularity (default)

- **GIVEN** the selected period is year and `yearGranularity` is unset or `month`
- **WHEN** the charts render
- **THEN** the distance + duration chart SHALL show at most 12 bars, one per calendar month, each summarizing that month's trips as the sum of distance and duration
- **AND** the speed + consumption chart SHALL show at most 12 points per line (one per calendar month), each summarizing that month's trips as the arithmetic mean of speed and of consumption

#### Scenario: Year with week granularity

- **GIVEN** the selected period is year and `yearGranularity` is `week`
- **WHEN** the charts render
- **THEN** the distance + duration chart SHALL show one bar per ISO week (up to 53), each summarizing that week's trips as the sum of distance and duration
- **AND** the speed + consumption chart SHALL show one point per ISO week per line, each summarizing that week's trips as the arithmetic mean of speed and of consumption

#### Scenario: Toggling year granularity

- **WHEN** the user toggles between Month and Week granularity while the period is year
- **THEN** the system SHALL request `/partials/stats?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label

#### Scenario: Granularity toggle sits above the chart region

- **GIVEN** the selected period is year and the viewport is at or above the tablet breakpoint
- **WHEN** the stats region renders
- **THEN** the year-granularity toggle SHALL appear directly above the chart canvases and below the stat cards, not between the period switcher and the period navigation control

### Requirement: Previous-period deltas are shown for each stat

The system SHALL display a delta for each stat comparing the selected period to the previous equivalent period (previous ISO week, previous calendar month, previous calendar year), relative to the anchor date — not relative to the current date. When no `date` parameter is present, the delta SHALL compare the current period to the previous current period. The delta SHALL use the same delta-indicator pattern as the home page.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

The delta indicator SHALL NOT render a unit suffix or a period-aware suffix. The selected period is already visible from the period switcher and the period navigation control, making a `vs last week` / `vs last month` / `vs last year` suffix redundant. The unit is already visible on the stat card's value, making a unit suffix on the delta redundant. The trend icon, the sign, the value, and the color class are sufficient.

#### Scenario: Delta vs previous period for current period

- **GIVEN** current month total distance is 200 km and previous month total distance was 150 km
- **WHEN** the user views the current month period
- **THEN** the total-distance stat SHALL display an upward delta with a `trending-up` icon, a `+` sign, the value `50.0`, and the `positive` color class, with no unit suffix and no period-aware suffix

#### Scenario: Delta follows selected past period

- **GIVEN** July 2026 total distance is 180 km and June 2026 total distance was 220 km
- **WHEN** the user views July 2026 (`date=2026-07`)
- **THEN** the total-distance stat SHALL display a downward delta with a `trending-down` icon, the value `-40.0`, and the `negative` color class, with no unit suffix and no period-aware suffix

#### Scenario: Trend icon reflects equal current and previous values

- **GIVEN** the current period total distance equals the previous period total distance
- **WHEN** the delta indicator renders
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the value with no unit or period suffix

#### Scenario: No previous-period data

- **GIVEN** the previous period relative to the anchor has no trips
- **WHEN** the user views the selected period
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta, with no trend icon
