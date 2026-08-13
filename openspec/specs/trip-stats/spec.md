## Purpose

Provides a dedicated stats page that aggregates trip statistics over week, month, and year periods, with previous-period deltas and two dual-axis charts visualizing per-trip (or bucketed, for year) distance, duration, average speed, and consumption.

## Requirements

### Requirement: Stats page is reachable at a dedicated route

The system SHALL serve a stats page at `GET /stats` that displays aggregated trip statistics for a selectable period (week, month, or year) for the vehicle of the most recent trip.

#### Scenario: Visiting the stats page

- **GIVEN** at least one trip exists
- **WHEN** the user visits `/stats`
- **THEN** the system SHALL render the stats page with the period defaulting to the current month, showing stats and charts for the vehicle of the most recent trip

#### Scenario: Stats page with no trips at all

- **GIVEN** no trips exist
- **WHEN** the user visits `/stats`
- **THEN** the system SHALL render the stats page with null stats, an empty-state message in place of charts, and the period switcher still functional

### Requirement: Period selection switches week, month, and year

The system SHALL let the user select a period of `week`, `month`, or `year`. The week period SHALL cover the current ISO week (Monday 00:00 to next Monday 00:00) in the display timezone; the month period SHALL cover the current calendar month; the year period SHALL cover the current calendar year. All bounds SHALL be computed in the display timezone and applied to `trips.end_time` as UTC.

#### Scenario: Switching to week

- **WHEN** the user selects the `week` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current ISO week (Monday inclusive to next Monday exclusive) in the display timezone

#### Scenario: Switching to year

- **WHEN** the user selects the `year` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current calendar year in the display timezone

### Requirement: Period switching uses HTMX partial swap

The system SHALL switch periods without a full page reload by requesting `GET /partials/stats` with the selected period and swapping the stats + charts region of the page.

#### Scenario: Partial swap on period change

- **WHEN** the user changes the period switcher
- **THEN** the system SHALL request `/partials/stats?period=<week|month|year>&yearGranularity=<month|week>` and replace only the stats and charts region, leaving the rest of the page intact

### Requirement: Stats values are aggregated for the selected period

For the selected period the system SHALL display: total distance (km, sum of `distance_km`), average speed (km/h, arithmetic mean of per-trip `avg_speed_kmh` over trips that have a non-null value), average duration (min, arithmetic mean of `duration_min`), average consumption (kWh/100km, arithmetic mean of `avg_consumption_kwh_100km` over trips that have a non-null value), and trip count. Values SHALL be null when no trips exist in the period. Duration SHALL also be displayable as hours and minutes.

#### Scenario: Aggregates with trips in period

- **GIVEN** three trips in the current month with `avg_speed_kmh` of 40, 50, 60
- **WHEN** the user views the month period
- **THEN** the average speed SHALL display as 50 km/h and the trip count SHALL display as 3

#### Scenario: Null stats for empty period

- **GIVEN** no trips in the current week
- **WHEN** the user views the week period
- **THEN** total distance, average speed, average duration, average consumption, and trip count SHALL render as a dash/empty state rather than zero

### Requirement: Previous-period deltas are shown for each stat

The system SHALL display a delta for each stat comparing the current period to the previous equivalent period (previous ISO week, previous calendar month, previous calendar year), using the same delta-indicator pattern as the home page.

#### Scenario: Delta vs previous period

- **GIVEN** current month total distance is 200 km and previous month total distance was 150 km
- **WHEN** the user views the month period
- **THEN** the total-distance stat SHALL display an upward delta indicating +50 km versus the previous month

#### Scenario: No previous-period data

- **GIVEN** the previous period has no trips
- **WHEN** the user views the current period
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta

### Requirement: Two dual-axis charts render the current period only

The system SHALL render exactly two charts for the current period (never the previous period):

1. A distance + duration chart with distance (km) on the left y-axis and duration (min) on the right y-axis.
2. An average-speed + average-consumption chart with speed (km/h) on the left y-axis and consumption (kWh/100km) on the right y-axis.

Both charts SHALL use Chart.js, loaded only on the stats page.

#### Scenario: Per-trip charts for week and month

- **GIVEN** the selected period is week or month
- **WHEN** the charts render
- **THEN** each chart SHALL show one bar per trip in the period, ordered by `end_time` ascending

#### Scenario: Dual y-axes present

- **WHEN** either chart renders
- **THEN** the chart SHALL display two y-axes with distinct units and scale the two series independently

### Requirement: Year period charts are bucketed with a granularity toggle

For the year period the system SHALL NOT render one bar per trip. It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. Each bucket bar SHALL represent the sum of distance and duration (chart 1) and the arithmetic mean of speed and consumption (chart 2) over the trips in that bucket.

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
- **THEN** the system SHALL request `/partials/stats?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

### Requirement: Empty period renders an empty chart state

When the selected period has no trips, the system SHALL render an empty-state message in place of the canvases and SHALL NOT attempt to render empty charts.

#### Scenario: Empty period

- **GIVEN** the selected period has no trips
- **WHEN** the stats region renders
- **THEN** the system SHALL display an empty-state message where the charts would appear and SHALL render null/dash stats values

### Requirement: Chart data is embedded server-side and rendered client-side

The system SHALL embed the chart series as JSON in the stats page HTML, and a vanilla-JS init script SHALL read that JSON and render the Chart.js canvases. No client-side framework SHALL be shipped; only Chart.js (via CDN) and the init script.

#### Scenario: Charts render from embedded JSON

- **WHEN** the stats page loads with trips in the period
- **THEN** the page SHALL contain a JSON blob with the per-trip or bucketed series, and the init script SHALL construct the two Chart.js instances from it

### Requirement: Chart.js is loaded only on the stats page

The system SHALL include the Chart.js CDN `<script>` tag and the stats init script only when rendering the stats page, not on the home page or trip form.

#### Scenario: Home page does not load Chart.js

- **WHEN** the user visits `/`
- **THEN** the response SHALL NOT include the Chart.js script tag or the stats init script

### Requirement: Charts are hidden on phone-sized viewports

The system SHALL hide the chart canvases on phone-sized viewports via CSS and SHALL keep the stats cards (totals, deltas, trip count) and the period switcher visible. Charts remain rendered on tablet and desktop widths. The page is still reachable at `/stats` on phone; only the chart region is suppressed.

#### Scenario: Phone hides charts, keeps stats

- **WHEN** the user views `/stats` on a viewport narrower than the tablet breakpoint
- **THEN** the stats cards, period switcher, and year-granularity toggle SHALL remain visible and the chart region SHALL be hidden

#### Scenario: Tablet/desktop shows charts

- **WHEN** the user views `/stats` on a viewport at or above the tablet breakpoint
- **THEN** the chart region SHALL render alongside the stats cards
