## Purpose

Provides a server-rendered home page that displays monthly trip statistics and recent trips list, optimized for responsive mobile usage with quick access to log new trips.

## Requirements

### Requirement: Home page displays monthly trip statistics

The system SHALL render a home page at `/` that displays aggregated trip statistics for the current calendar month. The stats panel SHALL contain six aggregates laid out in the same hero + grid layout specified by the `trip-stats` capability for the stats page:

- **Hero tier (two cards):** total distance (km, sum of `distance_km`) and total time driven (sum of `duration_min` rendered as a human-readable `xh ym` / `xh` / `ym` string, identical to the stats page formatting rules).
- **Grid tier (four cards in a single row on desktop, two columns on phone):** average speed (km/h), average duration (arithmetic mean of `duration_min`, rendered as a human-readable `xh ym` / `xh` / `ym` string with empty unit slot, identical to the stats page formatting rules), average consumption (kWh/100km), and trip count.

The hero cards SHALL apply the same hero styling as the stats page (larger value font, primary color, larger padding). The average-duration and total-time-driven cards SHALL display the human-readable hours-and-minutes string as their primary value with an empty unit slot; the raw minutes number SHALL NOT be rendered. When a stat value is null, the card SHALL render `--` (and the average-duration / total-time cards SHALL render `--` with no unit suffix), matching the empty-period behavior of the stats page.

The home page remains month-scoped: no period switcher, no `date` query parameter, no period navigation control. The hero + grid layout is the same component used by the stats page (modulo the surrounding period switcher, navigation, and charts), so the two pages present the same stats panel for the current month.

#### Scenario: Successful stats display with all six aggregates

- **GIVEN** trips exist for the current month for the displayed vehicle
- **WHEN** the user visits the home page `/`
- **THEN** the system displays six stat cards in the hero + grid layout: total distance and total time driven as hero cards, and average speed, average duration, average consumption, and trip count as grid-tier cards

#### Scenario: Total time driven and average duration render as hours and minutes

- **GIVEN** trips in the current month with total `duration_min` of 377 and average `duration_min` of 90
- **WHEN** the home page renders
- **THEN** the total-time-driven hero card SHALL display `6h 17m` with no unit suffix, and the average-duration grid card SHALL display `1h 30m` with no unit suffix, and the raw minutes numbers (`377`, `90`) SHALL NOT appear in either card

#### Scenario: Hero cards use the stats page hero treatment

- **WHEN** the home page hero cards render
- **THEN** the hero cards SHALL apply the same hero styling as the stats page hero cards (larger value font, primary color, larger padding) and SHALL be visually distinguishable from the grid-tier cards

#### Scenario: Desktop renders heroes in one row and grid in a four-column row

- **WHEN** the home page renders on a viewport at or above the tablet breakpoint
- **THEN** the two hero cards SHALL render side by side in a single row of two equal columns, and the four grid-tier cards SHALL render side by side in a single row of four equal columns, matching the stats page responsive behavior

#### Scenario: Phone renders stacked heroes and a two-column grid

- **WHEN** the home page renders on a viewport narrower than the tablet breakpoint
- **THEN** the total-distance and total-time-driven hero cards SHALL each occupy the full content width and stack vertically, and the four grid-tier cards SHALL render in a two-column grid

#### Scenario: Empty month renders the hero + grid layout with dashes

- **GIVEN** no trips exist for the current month for the displayed vehicle
- **WHEN** the home page renders the stats panel
- **THEN** the hero + grid layout SHALL still render with all six card slots in their responsive positions, each displaying the empty `--` state, with the average-duration and total-time cards rendering `--` and no unit suffix

#### Scenario: Home page does not render a period switcher, navigation, or charts

- **WHEN** the home page renders
- **THEN** the page SHALL NOT include a period switcher, a period navigation control, a year-granularity toggle, the chart canvases, the Chart.js script tag, or the stats init script; only the hero + grid stats panel, the trip list, the header, and the sticky CTA SHALL render

### Requirement: Home page displays trip list

The system SHALL render a list of trips for the current calendar month, ordered with newest trips first.

#### Scenario: Successful trip list display

- **WHEN** user visits the home page `/` and trips exist for current month
- **THEN** system displays a list of trips ordered by newest first, showing date, time range, daypart indicator, and consumption

### Requirement: Trip detail expansion

The system SHALL allow users to expand trip rows to view additional details without page reload.

#### Scenario: Successful trip expansion

- **WHEN** user taps on a collapsed trip row in the list
- **THEN** system reveals additional trip details (distance, average speed, odometer reading, locations)

### Requirement: Prominent new trip CTA

The system SHALL display a prominent "Log new trip" button that remains accessible during scrolling.

#### Scenario: CTA visibility on phone

- **WHEN** user views the home page on a mobile device
- **THEN** the "Log new trip" button is sticky and positioned for thumb access

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

### Requirement: Vehicle-specific display

The system SHALL display data for the vehicle associated with the most recent trip.

#### Scenario: Vehicle selection for display

- **WHEN** user visits the home page
- **THEN** system displays statistics and trips for the vehicle of the most recent trip, with vehicle identifier shown in header

### Requirement: Empty state handling

The system SHALL display appropriate messaging when no trips exist for the current month. The empty state SHALL render a `circle-off` `lucide-static` font icon (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline with the message text.

#### Scenario: Empty state display

- **WHEN** user visits the home page and no trips exist for current month
- **THEN** system displays "No trips yet — log your first commute" message with a `circle-off` icon rendered inline before the text, with a pointer to CTA

#### Scenario: Empty state icon is sized and aligned with the text

- **GIVEN** the home page renders the empty state
- **WHEN** the empty state renders
- **THEN** the `circle-off` icon SHALL be vertically centered with the message text and sized to match the message text, without shifting the text baseline

### Requirement: Responsive layout

The system SHALL adapt layout for different screen sizes, optimizing for mobile while supporting desktop.

#### Scenario: Responsive layout adaptation

- **WHEN** user views the home page on different screen sizes
- **THEN** system adjusts layout appropriately (phone: stacked elements, desktop: split layout)

### Requirement: Trip list fragment route

The system SHALL expose a fragment route `GET /partials/trips` that returns the current-month trip list markup (bare, no `Layout`) for HTMX region swaps, scoped to the displayed vehicle.

#### Scenario: Fragment returns trip list markup

- **GIVEN** trips exist for the current month for the displayed vehicle
- **WHEN** a `GET /partials/trips` request is received
- **THEN** the system SHALL respond with the trip list HTML (using the same trip row component as the home page) and no surrounding document

#### Scenario: Fragment empty state

- **GIVEN** no trips exist for the current month
- **WHEN** a `GET /partials/trips` request is received
- **THEN** the system SHALL respond with the empty-state markup

### Requirement: Stats fragment route

The system SHALL expose a fragment route `GET /partials/stats` that returns the same hero + grid summary markup rendered on the home page (bare, no `Layout`) for HTMX region swaps, scoped to the displayed vehicle. The fragment SHALL contain all six stat cards with month-over-month deltas and SHALL NOT render a period switcher, navigation, charts, or the Chart.js script. After a trip is created via `POST /trips`, the out-of-band stats refresh SHALL swap this fragment so the home page stats panel updates without a full reload.

#### Scenario: Fragment returns the hero + grid summary markup

- **WHEN** a `GET /partials/stats` request is received
- **THEN** the system SHALL respond with the hero + grid stats summary HTML (two hero cards, four grid-tier cards, MoM deltas on every card) and no surrounding document, no period switcher, and no chart scripts

#### Scenario: Fragment empty month

- **GIVEN** no trips exist for the current month for the displayed vehicle
- **WHEN** a `GET /partials/stats` request is received
- **THEN** the system SHALL respond with the hero + grid markup with all six cards rendering the empty `--` state and neutral deltas

#### Scenario: Out-of-band refresh after trip creation

- **GIVEN** a valid trip form submission to `POST /trips`
- **WHEN** the system processes the request
- **THEN** the response SHALL include the hero + grid stats fragment marked `hx-swap-oob="true"` so the home page stats panel refreshes alongside the new trip row, without a full page reload

### Requirement: Trip creation via HTML endpoint

The system SHALL accept trip creation via `POST /trips` (form-encoded, HTMX-submitted) and respond with HTML containing the new trip row plus an out-of-band refresh of the stats region, so the trip list and stats update from a single response without a page reload. This endpoint SHALL exist alongside `POST /api/trips` (JSON), which remains the contract for API/tooling consumers.

#### Scenario: Successful trip creation updates list and stats

- **GIVEN** a valid trip form submission to `POST /trips`
- **WHEN** the system processes the request
- **THEN** it SHALL respond with the new `TripRow` markup and a stats grid fragment marked `hx-swap-oob="true"` so the browser appends the row to the list and refreshes stats in one response

#### Scenario: Validation failure returns inline errors

- **GIVEN** an invalid trip form submission to `POST /trips`
- **WHEN** the system processes the request
- **THEN** it SHALL respond with problem details (per `error-handling`/`request-validation`) suitable for inline HTMX display, without creating a trip

### Requirement: Boosted navigation

The system SHALL enable HTMX boosted navigation on the document body so that navigation between pages (home, `/trips/new`, and future pages) avoids full page reloads, while remaining functional without JavaScript (progressive enhancement).

#### Scenario: Navigation swaps body without reload

- **WHEN** a user follows a link between pages with JavaScript enabled
- **THEN** the browser SHALL issue an AJAX request and swap the `<body>` content rather than performing a full page reload

#### Scenario: Navigation without JavaScript

- **WHEN** a user navigates without JavaScript
- **THEN** links SHALL fall back to standard full-page requests

### Requirement: New trip form page

The system SHALL render a trip creation form at `GET /trips/new` composed through `Layout`, with fields for the trip inputs (vehicle, start/end location, start/end time, odometer, consumption) and an HTMX-submitted form posting to `POST /trips`. The form SHALL reuse shared components (`Header`, `StickyCta`-style patterns) and be styled per the Pico-grounded `app.css` rules.

#### Scenario: Form page renders

- **WHEN** a user visits `/trips/new`
- **THEN** the system SHALL render the trip form wrapped in `Layout`, with semantic HTML inputs and Pico styling, posting to `/trips`

#### Scenario: Form posts via HTMX

- **WHEN** the user submits the trip form
- **THEN** the form SHALL be submitted via HTMX to `POST /trips` and the response SHALL update the trip list and stats without a full reload
