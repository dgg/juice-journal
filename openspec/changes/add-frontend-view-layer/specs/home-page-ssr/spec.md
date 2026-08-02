## ADDED Requirements

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
