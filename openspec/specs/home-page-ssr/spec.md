## Purpose

Provides a server-rendered home page that displays monthly trip statistics and recent trips list, optimized for responsive mobile usage with quick access to log new trips.

## Requirements

### Requirement: Home page displays monthly trip statistics

The system SHALL render a home page at `/` that displays aggregated trip statistics for the current calendar month, including average consumption, average duration, and total distance.

#### Scenario: Successful stats display

- **WHEN** user visits the home page `/`
- **THEN** system displays current month's aggregated trip statistics (average consumption, average duration, total distance)

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

The system SHALL display month-over-month comparisons for average consumption and average duration statistics. The home page is implicitly month-scoped, so the delta indicator suffix SHALL read `vs last month`.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

#### Scenario: Successful MoM comparison display

- **WHEN** user visits the home page and previous month data exists
- **THEN** system displays delta indicators comparing current month to previous month statistics, each with the suffix `vs last month` and a trend icon reflecting whether the current value is larger (`trending-up`), smaller (`trending-down`), or equal (`trending-up-down`) than the previous month

#### Scenario: Equal month-over-month value renders neutral trend icon

- **GIVEN** the current month average consumption equals the previous month average consumption
- **WHEN** the home page renders the average-consumption delta
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the suffix `vs last month`

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

The system SHALL expose a fragment route `GET /partials/stats` that returns the stats grid markup (bare, no `Layout`) for HTMX region swaps, scoped to the displayed vehicle.

#### Scenario: Fragment returns stats markup

- **WHEN** a `GET /partials/stats` request is received
- **THEN** the system SHALL respond with the stats grid HTML (hero stat, secondary stats, MoM deltas) and no surrounding document

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
