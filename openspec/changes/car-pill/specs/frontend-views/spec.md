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

- **GIVEN** an expanded trip row displays distance, duration, speed, odometer, and locations
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