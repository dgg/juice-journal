## MODIFIED Requirements

### Requirement: Trip list fragment route

The system SHALL expose a fragment route `GET /trips/fragments/list` that returns the current-month trip list markup (bare, no `Layout`) for HTMX region swaps, scoped to the displayed vehicle.

#### Scenario: Fragment returns trip list markup

- **GIVEN** trips exist for the current month for the displayed vehicle
- **WHEN** a `GET /trips/fragments/list` request is received
- **THEN** the system SHALL respond with the trip list HTML (using the same trip row component as the home page) and no surrounding document

#### Scenario: Fragment empty state

- **GIVEN** no trips exist for the current month
- **WHEN** a `GET /trips/fragments/list` request is received
- **THEN** the system SHALL respond with the empty-state markup

### Requirement: Stats fragment route

The system SHALL expose a fragment route `GET /summary/fragments/grid` that returns the same hero + grid summary markup rendered on the home page (bare, no `Layout`) for HTMX region swaps, scoped to the displayed vehicle. The fragment SHALL contain all six stat cards with month-over-month deltas and SHALL NOT render a period switcher, navigation, charts, or the Chart.js script. After a trip is created via `POST /trips`, the out-of-band stats refresh SHALL swap this fragment so the home page stats panel updates without a full reload.

#### Scenario: Fragment returns the hero + grid summary markup

- **WHEN** a `GET /summary/fragments/grid` request is received
- **THEN** the system SHALL respond with the hero + grid stats summary HTML (two hero cards, four grid-tier cards, MoM deltas on every card) and no surrounding document, no period switcher, and no chart scripts

#### Scenario: Fragment empty month

- **GIVEN** no trips exist for the current month for the displayed vehicle
- **WHEN** a `GET /summary/fragments/grid` request is received
- **THEN** the system SHALL respond with the hero + grid markup with all six cards rendering the empty `--` state and neutral deltas

#### Scenario: Out-of-band refresh after trip creation

- **GIVEN** a valid trip form submission to `POST /trips`
- **WHEN** the system processes the request
- **THEN** the response SHALL include the hero + grid stats fragment marked `hx-swap-oob="true"` so the home page stats panel refreshes alongside the new trip row, without a full page reload

### Requirement: Boosted navigation

The system SHALL enable HTMX boosted navigation on the document body so that navigation between pages (home, `/trips/creation`, and future pages) avoids full page reloads, while remaining functional without JavaScript (progressive enhancement).

#### Scenario: Navigation swaps body without reload

- **WHEN** a user follows a link between pages with JavaScript enabled
- **THEN** the browser SHALL issue an AJAX request and swap the `<body>` content rather than performing a full page reload

#### Scenario: Navigation without JavaScript

- **WHEN** a user navigates without JavaScript
- **THEN** links SHALL fall back to standard full-page requests

### Requirement: New trip form page

The system SHALL render a trip creation form at `GET /trips/creation` composed through `Layout`, with fields for the trip inputs (vehicle, start/end location, start/end time, odometer, consumption) and an HTMX-submitted form posting to `POST /trips`. The form SHALL reuse shared components (`Header`, `StickyCta`-style patterns) and be styled per the Pico-grounded `app.css` rules.

#### Scenario: Form page renders

- **WHEN** a user visits `/trips/creation`
- **THEN** the system SHALL render the trip form wrapped in `Layout`, with semantic HTML inputs and Pico styling, posting to `/trips`

#### Scenario: Form posts via HTMX

- **WHEN** the user submits the trip form
- **THEN** the form SHALL be submitted via HTMX to `POST /trips` and the response SHALL update the trip list and stats without a full reload
