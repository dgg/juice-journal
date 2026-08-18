## MODIFIED Requirements

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

### Requirement: Month-over-month statistics comparison

The system SHALL display month-over-month comparison deltas for every stat card on the home page — total distance, total time driven, average speed, average duration, average consumption, and trip count. The home page is implicitly month-scoped, so the delta indicator suffix SHALL read `vs last month` for every card.

Each delta indicator SHALL render a trend icon inline before the delta value, driven by the sign of the delta and using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `trending-up` when the current value is larger than the previous value, `trending-down` when the current value is smaller, and `trending-up-down` when the two values are equal. The existing color coding (`positive` / `negative` / neutral) SHALL remain; the icon is additive and SHALL NOT replace the color signal.

For the total-time-driven and average-duration cards, the delta SHALL be computed from the raw minutes values (current minus previous) but the `deltaUnit` SHALL be `min`, while the card's primary value remains the human-readable hours-and-minutes string. When either the current or previous value is null, the delta SHALL render the neutral/empty state with no trend icon, matching the stats page behavior.

#### Scenario: Successful MoM comparison display for all six stats

- **GIVEN** the current month and previous month both have trips for the displayed vehicle
- **WHEN** the user visits the home page
- **THEN** each of the six stat cards SHALL display a delta indicator comparing the current month to the previous month, with the suffix `vs last month` and a trend icon reflecting whether the current value is larger (`trending-up`), smaller (`trending-down`), or equal (`trending-up-down`) than the previous month

#### Scenario: Equal month-over-month value renders neutral trend icon

- **GIVEN** the current month average consumption equals the previous month average consumption
- **WHEN** the home page renders the average-consumption delta
- **THEN** the indicator SHALL render a `trending-up-down` icon with no `+` or `-` sign and the neutral color class, followed by the suffix `vs last month`

#### Scenario: Total time driven delta uses minutes as delta unit

- **GIVEN** the current month total `duration_min` is 377 and the previous month total `duration_min` is 300
- **WHEN** the home page renders the total-time-driven delta
- **THEN** the delta SHALL display `+77 min` (or equivalent sign-prefixed value with `min` unit) with the appropriate trend icon and the suffix `vs last month`, while the card's primary value remains the `6h 17m` human-readable string

#### Scenario: No previous-month data renders neutral deltas

- **GIVEN** the previous month has no trips for the displayed vehicle
- **WHEN** the user visits the home page
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta, with no trend icon, on all six cards

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
