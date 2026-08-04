## MODIFIED Requirements

### Requirement: Application stylesheet contract

The system SHALL maintain a single pure-CSS file at `public/app.css` served statically. All custom CSS SHALL live in this file; inline `<style>` blocks and inline `style` attributes (`style={{...}}` in JSX or `style="..."` in static markup) SHALL NOT appear in any view component. CSS SHALL be applied in order of preference: (1) native Pico styling or semantic HTML, (2) overriding `--pico-*` custom properties or extending Pico classes, (3) custom rules in `app.css` scoped under domain-semantic class names that describe what an element *is* in the product domain (e.g. `trip-snapshot`, `stat-card`, `badge`), never utility names that describe how it looks (e.g. `.flex-1`, `.text-center`, `.mb-4`).

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

## ADDED Requirements

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
- **THEN** it SHALL use a `<small>` element with a `badge` class, styled via `public/app.css`, with no inline `style` attribute
