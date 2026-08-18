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
- **THEN** the stats and charts SHALL reflect trips whose `end_time` falls within July 2026 in the display timezone

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
- **THEN** the system SHALL request `/partials/stats?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label

#### Scenario: Granularity toggle sits above the chart region

- **GIVEN** the selected period is year and the viewport is at or above the tablet breakpoint
- **WHEN** the stats region renders
- **THEN** the year-granularity toggle SHALL appear directly above the chart canvases and below the stat cards, not between the period switcher and the period navigation control

### Requirement: Empty period renders an empty chart state

When the selected period has no trips, the system SHALL render an empty-state message in place of the canvases and SHALL NOT attempt to render empty charts. The empty state SHALL render a `circle-off` `lucide-static` font icon (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline with a "no stats" message distinct from the trips empty-state message, so the stats empty state is visually identifiable.

#### Scenario: Empty period

- **GIVEN** the selected period has no trips
- **WHEN** the stats region renders
- **THEN** the system SHALL display an empty-state message where the charts would appear, carrying a `circle-off` icon inline before the text, and SHALL render null/dash stats values

#### Scenario: Stats empty-state message differs from trips empty state

- **GIVEN** the stats page renders for a period with no trips
- **WHEN** the empty state renders
- **THEN** the message SHALL be a "no stats" message (not the home-page "No trips yet — log your first commute" message) and SHALL carry the `circle-off` icon inline before the text

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

The system SHALL hide the chart canvases on phone-sized viewports via CSS and SHALL keep the stats cards (totals, deltas, trip count) and the period switcher visible. The year-granularity toggle SHALL also be hidden on phone-sized viewports, since it only affects chart bucketing and is meaningless without the charts. Charts and the year-granularity toggle remain rendered on tablet and desktop widths. The page is still reachable at `/stats` on phone; the chart region and year-granularity toggle are suppressed.

#### Scenario: Phone hides charts and year granularity, keeps stats

- **WHEN** the user views `/stats` on a viewport narrower than the tablet breakpoint
- **THEN** the stats cards, period switcher, and period navigation control SHALL remain visible, and both the chart region and the year-granularity toggle SHALL be hidden

#### Scenario: Tablet/desktop shows charts and year granularity

- **WHEN** the user views `/stats` on a viewport at or above the tablet breakpoint
- **THEN** the chart region and the year-granularity toggle (when the period is year) SHALL render alongside the stats cards

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

### Requirement: Period label block renders week bounds only in week mode

The stats region SHALL render a period-label block adjacent to the vehicle indicator (the car icon plus vehicle description). The block's content SHALL be period-dependent: in the `week` period it SHALL display a human-readable week-bounds string of the form `dd MMM – dd MMM` (e.g. `18 Aug – 24 Aug`) computed from the ISO week bounds in the display timezone; in the `month` and `year` periods it SHALL NOT render the period label text at all, rendering only the vehicle indicator (car icon and vehicle description) when a vehicle exists. The week-bounds string SHALL use the display timezone, SHALL start at the ISO week's Monday and end at its Sunday (inclusive), and SHALL format both endpoints as `dd MMM` (zero-padded day, abbreviated month name in the display locale). The `data.label` field SHALL remain available on the stats view for non-fragment consumers but SHALL NOT be rendered inside this block in any period.

#### Scenario: Week mode renders week bounds next to the vehicle indicator

- **GIVEN** the selected period is `week` and the anchor ISO week is 18–24 August 2026 in the display timezone
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL display `18 Aug – 24 Aug` adjacent to the car icon and vehicle description

#### Scenario: Month mode renders no period label text

- **GIVEN** the selected period is `month` and the anchor month is August 2026
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL NOT contain the period label string (e.g. `August 2026`) and SHALL render only the car icon and vehicle description when a vehicle exists

#### Scenario: Year mode renders no period label text

- **GIVEN** the selected period is `year` and the anchor year is 2026
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL NOT contain the period label string (e.g. `2026`) and SHALL render only the car icon and vehicle description when a vehicle exists

#### Scenario: Week bounds follow the display timezone

- **GIVEN** the selected period is `week` and the anchor ISO week starts on Monday 18 August 2026 in the configured display timezone
- **WHEN** the week-bounds string is rendered
- **THEN** the start endpoint SHALL be `18 Aug` and the end endpoint SHALL be `24 Aug`, both derived from the same ISO-week bounds used to filter trips

#### Scenario: Week bounds update on period navigation

- **GIVEN** the user is viewing the week period for the week of 18–24 August 2026
- **WHEN** the user navigates to the previous ISO week
- **THEN** the period-label block SHALL display `11 Aug – 17 Aug`

#### Scenario: No vehicle leaves only the week bounds in week mode

- **GIVEN** the selected period is `week` and no vehicle is associated with the most recent trip
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL display only the week-bounds string and SHALL NOT render the car icon or a vehicle description

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
