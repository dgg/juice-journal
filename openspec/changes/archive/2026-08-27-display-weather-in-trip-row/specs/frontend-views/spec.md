## MODIFIED Requirements

### Requirement: Semantic HTML element selection

View components SHALL use the semantically correct HTML element for each piece of content, accepting Pico's native styling for that element in preference to manual `font-size` or `font-weight` overrides. Specifically: page and section titles SHALL use heading elements (`<h1>` through `<h6>`) establishing a single coherent document outline; timestamps SHALL use `<time>` with a machine-readable `datetime` attribute; machine-readable numeric values SHALL use `<data>` with a `value` attribute; secondary text and inline badges SHALL use `<small>`; standalone prose SHALL use `<p>`; term-description pairs SHALL use `<dl>`/`<dt>`/`<dd>`. Generic container `<div>` elements SHALL be used only for layout grouping that has no semantic alternative.

#### Scenario: Trip row heading and timestamp

- **GIVEN** a trip row displays a trip's date and time range
- **WHEN** the row's summary is rendered
- **THEN** the date SHALL be a heading element (`<h3>`) establishing it as the row's title in the document outline, and the time range SHALL be a `<time>` element with a machine-readable `datetime` attribute

#### Scenario: Stat card value with unit

- **GIVEN** a stat card displays a numeric value and a unit
- **WHEN** the value is rendered
- **THEN** the numeric value SHALL be wrapped in a `<data>` element with a machine-readable `value` attribute, and the unit SHALL be a `<small>` element

#### Scenario: Trip detail term-description pairs

- **GIVEN** an expanded trip row displays distance, duration, speed, odometer, locations, and start-of-trip weather
- **WHEN** these fields are rendered
- **THEN** they SHALL be authored as a `<dl>` with `<dt>` labels and `<dd>` values, scoped under a `trip-snapshot` class, with no inline `style` attributes on any `dl`, `dt`, or `dd`

#### Scenario: Page title accepts Pico sizing

- **GIVEN** the page header displays the current month as the document's top title
- **WHEN** the `<h1>` is rendered
- **THEN** it SHALL accept Pico's native `<h1>` font size and weight, with no inline `font-size` or `font-weight` override on the element

#### Scenario: Vehicle badge uses small

- **GIVEN** the header displays the vehicle description as a secondary badge
- **WHEN** the badge is rendered
- **THEN** it SHALL use a `<small>` element with a `badge` class, styled via `public/app.css`, SHALL render a `car-front` `lucide-static` font icon (`<span class="icon-car-front" aria-hidden="true"></span>`) inline before the vehicle description, and SHALL NOT use inline `style` attributes

#### Scenario: Vehicle badge icon is sized and aligned with the text

- **GIVEN** the vehicle badge renders with the `car-front` icon
- **WHEN** the badge renders
- **THEN** the icon SHALL be vertically centered with the description text and sized to match the badge text size, without shifting the text baseline

#### Scenario: Weather detail pill renders start-of-trip conditions

- **GIVEN** a trip row whose `weatherStart` is non-null
- **WHEN** the row's detail `<dl>` is rendered
- **THEN** the row SHALL include a `<dt class="sr-only">Weather</dt>` followed by a single `<dd class="trip-detail-pill">` containing, in order: a WMO-category `lucide-static` icon span, a `<data>` element for temperature with a `<span class="pill__unit">°</span>` unit; an `icon-umbrella` span, a `<data>` for precipitation with `<small class="pill__unit">mm</small>`; an `icon-droplets` span, a `<data>` for humidity with `<small class="pill__unit">%</small>`; an `icon-wind` span, a rotated `icon-mouse-pointer-2` span carrying one of the eight `wind-from-*` classes, and a `<data>` for wind speed with `<small class="pill__unit">m/s</small>`. No inline `style` attribute SHALL appear on any element in the pill.

#### Scenario: Weather detail pill omitted when no start weather

- **GIVEN** a trip row whose `weatherStart` is null
- **WHEN** the row's detail `<dl>` is rendered
- **THEN** the Weather `<dt>`/`<dd>` pair SHALL NOT be rendered, and no weather icons, `<data>` elements, or wind-direction classes SHALL appear for that row

### Requirement: Application stylesheet contract

The system SHALL maintain a single pure-CSS file at `public/app.css` served statically. All custom CSS SHALL live in this file; inline `<style>` blocks and inline `style` attributes (`style={{...}}` in JSX or `style="..."` in static markup) SHALL NOT appear in any view component. CSS SHALL be applied in order of preference: (1) native Pico styling or semantic HTML, (2) overriding `--pico-*` custom properties or extending Pico classes, (3) custom rules in `app.css` scoped under domain-semantic class names that describe what an element _is_ in the product domain (e.g. `trip-snapshot`, `stat-card`, `badge`), never utility names that describe how it looks (e.g. `.flex-1`, `.text-center`, `.mb-4`).

#### Scenario: No inline styles in components

- **GIVEN** a view component requires styling beyond native Pico
- **WHEN** the component is authored
- **THEN** the styling SHALL be expressed in `public/app.css` under a domain-semantic class, never via an inline `<style>` block or an inline `style` attribute on the element

#### Scenario: Domain-semantic class naming

- **GIVEN** a custom CSS rule is added to `public/app.css`
- **WHEN** the rule's selector is chosen
- **THEN** the class name SHALL describe the element's role in the product domain (e.g. `trip-snapshot`, `stat-card`, `badge`) and SHALL NOT describe its appearance or layout (e.g. `flex-row`, `text-bold`)

#### Scenario: Stylesheet served statically

- **WHEN** the browser requests `/static/app.css`
- **THEN** the server SHALL return the contents of `public/app.css` with a CSS content type, loaded after Pico so app rules win the cascade

#### Scenario: Wind direction rendered via named rotation classes

- **GIVEN** the weather pill needs to indicate wind direction and `icon-mouse-pointer-2` in its native orientation points up-left (north-west, 315°)
- **WHEN** the wind-direction span is rendered
- **THEN** the span SHALL carry exactly one of the eight `wind-from-n`, `wind-from-ne`, `wind-from-e`, `wind-from-se`, `wind-from-s`, `wind-from-sw`, `wind-from-w`, `wind-from-nw` classes defined in `public/app.css`, each named for the wind's **origin** (where it blows from) and each applying a fixed clockwise `transform: rotate(...deg)` so the arrow points in the direction the wind is **traveling toward** (origin + 180°). No inline `transform` or `style` attribute SHALL be used on the span.

#### Scenario: Null wind direction omits the arrow

- **GIVEN** the start weather's `wind.direction` is null
- **WHEN** the weather pill is rendered
- **THEN** the `icon-mouse-pointer-2` wind-direction span SHALL be omitted (only the `icon-wind` streaks and the speed `<data>` remain); no `wind-from-*` class SHALL be emitted