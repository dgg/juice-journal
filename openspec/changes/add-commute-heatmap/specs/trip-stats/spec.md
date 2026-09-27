# Spec Delta

## ADDED Requirements

### Requirement: Calendar visualization renders per-trip events for week and month periods

The system SHALL render a calendar visualization below the two charts, inside the existing chart region, for the week and month periods only. The week period SHALL render a week-grid calendar (one column per day, Monday through Sunday) showing each trip as an event in its day cell. The month period SHALL render a month-grid calendar showing each trip as an event in its corresponding day cell. The year period SHALL NOT render a calendar, because year data is bucketed rather than per-trip. The calendar SHALL follow the same data-embedding pattern as the charts: the per-trip data SHALL be embedded as JSON in the stats page HTML, and a vanilla-JS init script SHALL read that JSON and render the calendar client-side. No client-side framework SHALL be shipped beyond FullCalendar and the init script.

#### Scenario: Week period renders a week-grid calendar

- **GIVEN** the selected period is week and at least one trip exists in the period
- **WHEN** the stats region renders
- **THEN** the system SHALL render a week-grid calendar below the charts, with each trip appearing as an event in its day cell

#### Scenario: Month period renders a month-grid calendar

- **GIVEN** the selected period is month and at least one trip exists in the period
- **WHEN** the stats region renders
- **THEN** the system SHALL render a month-grid calendar below the charts, with each trip appearing as an event in its corresponding day cell

#### Scenario: Year period renders no calendar

- **GIVEN** the selected period is year
- **WHEN** the stats region renders
- **THEN** the system SHALL NOT render a calendar, only the charts

#### Scenario: Calendar renders from embedded JSON

- **WHEN** the stats page loads with trips in the week or month period
- **THEN** the page SHALL contain a JSON blob with the per-trip data, and the init script SHALL construct the calendar from it

#### Scenario: Empty period renders no calendar

- **GIVEN** the selected period is week or month and has no trips
- **WHEN** the stats region renders
- **THEN** the system SHALL render the existing empty-state message in place of the charts and SHALL NOT render the calendar

#### Scenario: Calendar is hidden on phone-sized viewports

- **WHEN** the user views `/stats` on a viewport narrower than the tablet breakpoint
- **THEN** the calendar SHALL be hidden via the same CSS rule that hides the chart region, since the calendar renders inside that region

### Requirement: Calendar events display daypart icon and consumption with tone color-coding

Each trip rendered as a calendar event SHALL display the trip's daypart as an icon (morning or afternoon, using the project's `lucide-static` font-icon system) and the trip's consumption (kWh/100km) as the event's primary text. The consumption SHALL be color-coded against the period's average consumption: green when the trip's consumption is below the period average, amber when above the period average, and red for the trip with the highest consumption in the period. The trips with the minimum and maximum consumption in the period SHALL render with bold text. The tone SHALL be computed client-side from the embedded per-trip data and the period average, using Pico color variables so the tones follow any future restyle of the neutral palette.

#### Scenario: Trip below average renders green

- **GIVEN** the period average consumption is 15 kWh/100km and a trip's consumption is 12
- **WHEN** the calendar renders that trip's event
- **THEN** the event SHALL display the consumption with a green tone derived from a Pico color variable

#### Scenario: Trip above average renders amber

- **GIVEN** the period average consumption is 15 kWh/100km and a trip's consumption is 18
- **WHEN** the calendar renders that trip's event
- **THEN** the event SHALL display the consumption with an amber tone derived from a Pico color variable

#### Scenario: Highest-consumption trip renders red

- **GIVEN** a period with three trips consuming 12, 18, and 20 kWh/100km
- **WHEN** the calendar renders the trip consuming 20
- **THEN** the event SHALL display the consumption with a red tone derived from a Pico color variable

#### Scenario: Minimum and maximum consumption render bold

- **GIVEN** a period with trips consuming 12, 18, and 20 kWh/100km
- **WHEN** the calendar renders the minimum (12) and maximum (20) trips
- **THEN** both events SHALL render their consumption text in bold

#### Scenario: Daypart icon renders before consumption

- **GIVEN** a trip with daypart "morning"
- **WHEN** the calendar renders that trip's event
- **THEN** the event SHALL display the morning daypart icon before the consumption value

### Requirement: Calendar event click fetches trip detail pills

Clicking a calendar event SHALL fetch the trip's details and display them in the same pill shape used by the home page trip row. The system SHALL expose an HTMX endpoint `GET /stats/trips/:id` that returns the trip-detail-pills HTML (the `<dl class="trip-detail-pills">` block) for the requested trip. The response SHALL reuse the same view markup as the home page `TripRow` body so the pills are visually identical by construction. If the trip does not exist, the endpoint SHALL respond with a 404.

#### Scenario: Clicking a calendar event fetches details

- **GIVEN** the user clicks a calendar event for a trip with id "abc123"
- **WHEN** the click fires
- **THEN** the system SHALL request `GET /stats/trips/abc123` and display the returned trip-detail-pills HTML

#### Scenario: Detail pills match home page markup

- **WHEN** the `GET /stats/trips/:id` endpoint responds
- **THEN** the HTML SHALL contain the same `<dl class="trip-detail-pills">` structure used by the home page trip row, including distance, duration, speed, odometer, route, and weather pills

#### Scenario: Nonexistent trip returns 404

- **GIVEN** a request to `GET /stats/trips/nonexistent`
- **WHEN** no trip with that id exists
- **THEN** the system SHALL respond with a 404 status

### Requirement: Stats view carries per-trip data for week and month periods

The stats view SHALL include a per-trip data array for the week and month periods, containing each trip's id, end time, daypart, and consumption. This data SHALL be sourced from individual trip records (not day-bucketed aggregates) so that the calendar can render each trip separately with its daypart and consumption. The existing bucketed series that feeds the line charts SHALL remain unchanged. For the year period, the per-trip array SHALL be empty since the calendar does not render for year.

#### Scenario: Week period includes per-trip data

- **GIVEN** the selected period is week with three trips
- **WHEN** the stats view is computed
- **THEN** the view SHALL include a trips array with three entries, each carrying id, time, daypart, and consumption

#### Scenario: Month period includes per-trip data

- **GIVEN** the selected period is month with five trips across different days
- **WHEN** the stats view is computed
- **THEN** the view SHALL include a trips array with five entries, each carrying id, time, daypart, and consumption

#### Scenario: Year period includes empty trips array

- **GIVEN** the selected period is year
- **WHEN** the stats view is computed
- **THEN** the view SHALL include an empty trips array, and the bucketed series SHALL continue to feed the line charts

#### Scenario: Bucketed series remains unchanged

- **GIVEN** the selected period is month
- **WHEN** the stats view is computed
- **THEN** the bucketed series (labels, distance, duration, speed, consumption) SHALL remain sourced from day-bucketed aggregates, unchanged from the pre-calendar behavior

### Requirement: FullCalendar is loaded only on the stats page

The system SHALL include the FullCalendar script tag only when rendering the stats page, not on the home page or trip form, mirroring the Chart.js loading restriction.

#### Scenario: Home page does not load FullCalendar

- **WHEN** the user visits `/`
- **THEN** the response SHALL NOT include the FullCalendar script tag

#### Scenario: Trip form does not load FullCalendar

- **WHEN** the user visits `/trips/creation`
- **THEN** the response SHALL NOT include the FullCalendar script tag
