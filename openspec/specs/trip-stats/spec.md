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

The system SHALL let the user select a period of `week`, `month`, or `year`. The week period SHALL cover an ISO week (Monday 00:00 to next Monday 00:00) in the display timezone; the month period SHALL cover a calendar month; the year period SHALL cover a calendar year. When a `date` query parameter is present, period bounds SHALL be computed relative to the period containing that date; when absent, bounds SHALL default to the current period. All bounds SHALL be computed in the display timezone and applied to `trips.end_time` as UTC. The `date` parameter SHALL accept ISO week format (`YYYY-Www`) for the week period, `YYYY-MM` for the month period, and `YYYY` for the year period. The period switcher SHALL render one button per period; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `week` → `calendar-1`, `month` → `calendar-days`, `year` → `calendar`.

#### Scenario: Switching to week

- **WHEN** the user selects the `week` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current ISO week (Monday inclusive to next Monday exclusive) in the display timezone

#### Scenario: Switching to year

- **WHEN** the user selects the `year` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current calendar year in the display timezone

#### Scenario: Viewing a past period via date parameter

- **GIVEN** the user is viewing the month period and the current month is August 2026
- **WHEN** the user navigates to `/stats?period=month&date=2026-07`
- **THEN** the stats and charts SHALL reflect trips whose `end_time` falls within July 2026 in the display timezone, and the period label SHALL display "July 2026"

#### Scenario: Defaulting to current period when date is absent

- **WHEN** the user visits `/stats?period=week` without a `date` parameter
- **THEN** the system SHALL compute bounds for the current ISO week

#### Scenario: Invalid date parameter

- **WHEN** the user visits `/stats?period=month&date=not-a-date`
- **THEN** the system SHALL respond with a 400 error indicating the date parameter is invalid

#### Scenario: Period switcher buttons render a period-specific icon

- **GIVEN** the stats page renders the period switcher
- **WHEN** each period button renders
- **THEN** the week button SHALL contain an `icon-calendar-1` element, the month button SHALL contain an `icon-calendar-days` element, and the year button SHALL contain an `icon-calendar` element, each placed inline before the label

#### Scenario: Period icon is sized and aligned with the label

- **GIVEN** a period switcher button renders with its icon
- **WHEN** the button renders
- **THEN** the icon SHALL be vertically centered with the label text and sized to match the button text, without shifting the label baseline or breaking the segmented-button layout (flex:1, shared border-radius)

### Requirement: Period switching uses HTMX partial swap

The system SHALL switch periods without a full page reload by requesting `GET /partials/trip-stats` with the selected period, the current `date` value, and the current `yearGranularity`, and swapping the stats + charts region of the page.

#### Scenario: Partial swap on period change

- **WHEN** the user changes the period switcher
- **THEN** the system SHALL request `/partials/trip-stats?period=<week|month|year>&date=<current>&yearGranularity=<month|week>` and replace only the stats and charts region, leaving the rest of the page intact

#### Scenario: Partial swap preserves date across period changes

- **GIVEN** the user is viewing July 2026 (`date=2026-07`)
- **WHEN** the user switches the period from month to week
- **THEN** the system SHALL request `/partials/trip-stats?period=week&date=2026-07` and render the ISO week containing a day in July 2026

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

The system SHALL display a delta for each stat comparing the selected period to the previous equivalent period (previous ISO week, previous calendar month, previous calendar year), relative to the anchor date — not relative to the current date. When no `date` parameter is present, the delta SHALL compare the current period to the previous current period. The delta SHALL use the same delta-indicator pattern as the home page.

#### Scenario: Delta vs previous period for current period

- **GIVEN** current month total distance is 200 km and previous month total distance was 150 km
- **WHEN** the user views the current month period
- **THEN** the total-distance stat SHALL display an upward delta indicating +50 km versus the previous month

#### Scenario: Delta follows selected past period

- **GIVEN** July 2026 total distance is 180 km and June 2026 total distance was 220 km
- **WHEN** the user views July 2026 (`date=2026-07`)
- **THEN** the total-distance stat SHALL display a downward delta indicating -40 km versus June 2026

#### Scenario: No previous-period data

- **GIVEN** the previous period relative to the anchor has no trips
- **WHEN** the user views the selected period
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

For the year period the system SHALL NOT render one bar per trip. It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. Each bucket bar SHALL represent the sum of distance and duration (chart 1) and the arithmetic mean of speed and consumption (chart 2) over the trips in that bucket. The granularity toggle SHALL render one button per value; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system, matching the period switcher mapping: `month` → `calendar-days`, `week` → `calendar-1`.

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

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label

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

### Requirement: Period navigation control

The system SHALL render a period navigation control below the period switcher, consisting of a native date picker flanked by previous (◀) and next (▶) stepper buttons. The picker SHALL be an `<input type="week">` for the week period, `<input type="month">` for the month period, and a `<select>` of years for the year period. Both the picker and the stepper buttons SHALL manipulate the same `date` query parameter, keeping a single source of truth for the selected period. The ◀ and ▶ buttons SHALL carry precomputed adjacent-period `date` values in their request hrefs, so each HTMX swap renders buttons that are correct for the new anchor without client-side state.

#### Scenario: Stepper navigates to previous period

- **GIVEN** the user is viewing August 2026 (`date=2026-08`)
- **WHEN** the user clicks the ◀ button
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Stepper navigates to next period

- **GIVEN** the user is viewing June 2026 (`date=2026-06`)
- **WHEN** the user clicks the ▶ button
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Picker change triggers render

- **GIVEN** the user is viewing August 2026 and the picker shows `2026-08`
- **WHEN** the user selects `2026-03` in the picker and commits (e.g., taps Set on mobile)
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-03` and render March 2026 stats

#### Scenario: Picker and stepper stay in sync

- **GIVEN** the user navigated to July 2026 via the ◀ button
- **WHEN** the stats region re-renders
- **THEN** the picker SHALL display `2026-07` and the ◀ button SHALL target `date=2026-06` and the ▶ button SHALL target `date=2026-08`

#### Scenario: Clearing the picker resets to current period

- **GIVEN** the user is viewing July 2026 and the picker shows `2026-07`
- **WHEN** the user clears the picker (fires `change` with an empty value)
- **THEN** the system SHALL request `/partials/trip-stats?period=month` without a `date` parameter and render the current month stats

#### Scenario: Year picker is a select dropdown

- **GIVEN** the selected period is year
- **WHEN** the navigation control renders
- **THEN** the picker SHALL be a `<select>` element containing selectable years, with the anchor year marked as selected

### Requirement: Future period navigation is disabled

The system SHALL disable the ▶ (next) button when the anchor period is the current period or a future period. The system SHALL NOT render stats for a future period via the navigation control.

#### Scenario: Next button disabled at current period

- **GIVEN** the user is viewing the current month (August 2026)
- **WHEN** the stats region renders
- **THEN** the ▶ button SHALL be disabled

#### Scenario: Next button enabled for past period

- **GIVEN** the user is viewing June 2026 and the current month is August 2026
- **WHEN** the stats region renders
- **THEN** the ▶ button SHALL be enabled and target `date=2026-07`

### Requirement: Stats series query returns raw data, not display labels

The stats period series query SHALL return raw temporal data (`time` as a DateTime in the display timezone) and structured `daypart` (`"morning"` | `"afternoon"` | `null`) per row, and SHALL NOT format display labels or select presentation icons. The rendering layer (backend handler) SHALL construct the `series.labels` array from that raw data, applying bucket-specific date formats and appending the daypart icon only for the `trip` bucket where `daypart` is non-null. Aggregated buckets (`day`, `week`, `month`) SHALL carry `daypart: null` and the rendering layer SHALL emit no daypart icon for those rows.

#### Scenario: Trip bucket row carries structured daypart

- **GIVEN** a trip exists with `daypart = "morning"` and `end_time` on 14 Aug 2026
- **WHEN** the stats period series query runs with `bucket = "trip"`
- **THEN** the row SHALL return `time` as a DateTime for 14 Aug 2026 and `daypart = "morning"`, and SHALL NOT return a pre-formatted label string

#### Scenario: Aggregated bucket row carries null daypart

- **GIVEN** multiple trips exist within a calendar month
- **WHEN** the stats period series query runs with `bucket = "month"`
- **THEN** each row SHALL return `daypart = null` and `time` as the bucket start, and the rendering layer SHALL produce a label with no daypart icon

#### Scenario: Rendering layer builds trip label with daypart icon

- **GIVEN** the stats period series query returned a row with `time = 14 Aug 2026` and `daypart = "morning"` for the `trip` bucket
- **WHEN** the backend assembles the chart series labels
- **THEN** the label SHALL be `"14 Aug ☀"` (date formatted as `dd MMM` followed by the morning icon)

#### Scenario: Rendering layer builds aggregated label without icon

- **GIVEN** the stats period series query returned a row with `daypart = null` for the `day` bucket
- **WHEN** the backend assembles the chart series labels
- **THEN** the label SHALL be `"14 Aug"` (date formatted as `dd MMM`, no icon appended)
