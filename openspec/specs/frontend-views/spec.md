# frontend-views

## Purpose

Defines conventions for server-rendered view components and the application stylesheet, establishing a clean separation between data fetching (backend handlers) and display (typed JSX components), with HTMX as the interaction layer and Pico CSS as the styling basis.

## Requirements

### Requirement: Views are server-rendered JSX components

The system SHALL render all HTML via `hono/jsx` server-side components located under `src/frontend/`. No HTML SHALL be produced as inline template strings in backend handlers. Components SHALL NOT ship any client-side JavaScript runtime; only HTMX attributes and the HTMX library may run in the browser.

#### Scenario: Backend handler delegates to a view component

- **WHEN** a backend handler responds with HTML
- **THEN** it SHALL fetch data and return `c.html(<Component .../>)`, performing no string interpolation of markup

#### Scenario: No client JS framework shipped

- **WHEN** a page is rendered and served to the browser
- **THEN** the response SHALL contain no React/Vue/Svelte client runtime; HTMX library + optional Pico/Chart.js assets only

### Requirement: View layering by responsibility

The system SHALL organize views into three tiers: `components/` (reusable atoms carrying no page or HTMX-specific knowledge), `pages/` (full-document composition wrapped in `Layout`), and `fragments/` (bare composition for region-swap routes, attaching `hx-*` attributes). Atoms SHALL be reusable across pages, fragments, and out-of-band responses without duplication.

#### Scenario: Atom reused across page and fragment

- **WHEN** a trip row atom renders in the full home page and in the trip-list fragment
- **THEN** the same component SHALL be used in both contexts without duplicated markup

#### Scenario: HTMX attributes live on shells, not atoms

- **WHEN** an out-of-band swap targets a region
- **THEN** `hx-swap-oob` SHALL be applied at the fragment/page shell level, leaving atoms free of swap wiring

### Requirement: Layout composition

The system SHALL provide a single `Layout` component that emits `<!DOCTYPE html>`, `<head>` (including Pico CSS and the application stylesheet), and `<body>` wrapping page children. All full pages SHALL be composed through `Layout`; fragment routes SHALL bypass `Layout` and return bare components.

#### Scenario: Page wraps in Layout

- **WHEN** a full page route renders
- **THEN** the response document SHALL include the shared `<head>` (Pico + app.css) and the page content as `Layout` children

#### Scenario: Fragment bypasses Layout

- **WHEN** a fragment route responds
- **THEN** the response SHALL contain only the bare fragment markup, no full HTML document or repeated `<head>`

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

### Requirement: Automatic HTML escaping

The system SHALL rely on JSX's automatic output escaping for all interpolated values. Manual HTML-escape helper functions SHALL NOT be present in the view layer.

#### Scenario: Dynamic text is escaped

- **WHEN** a component renders user-supplied or dynamic text
- **THEN** the value SHALL be escaped automatically by JSX; no explicit `escapeHtml` call SHALL be required

### Requirement: Cross-page navigation via sticky CTA controls

Each primary page (home, stats) SHALL expose a sticky bottom-anchored navigation control that links to the other primary page. The control SHALL follow the existing sticky CTA visual pattern (Pico `role="button"` anchors inside a `.sticky-cta` container) and SHALL NOT introduce a global top navigation bar. Each action MAY specify an optional icon; when an icon is specified the sticky CTA SHALL render it inline with the action label using the project's existing icon system (a `lucide-static` font icon applied as `<span class="icon-<name>" aria-hidden="true"></span>`). The trip form page SHALL also use the same sticky CTA control for its bottom navigation: a `Back` navigation anchor and a `Save` action that submits the trip form. A sticky CTA action MAY specify `type: "submit"`; such an action SHALL render as a submit button within the enclosing form rather than an anchor.

#### Scenario: Home page links to stats

- **GIVEN** the user is viewing the home page at `/`
- **WHEN** the page renders
- **THEN** a sticky CTA control SHALL contain an anchor to `/stats` with a label identifying the stats page

#### Scenario: Stats page links back to home

- **GIVEN** the user is viewing the stats page at `/stats`
- **WHEN** the page renders
- **THEN** a sticky CTA control SHALL contain an anchor to `/` with a label identifying the home page

#### Scenario: Home page retains log-trip CTA

- **GIVEN** the user is viewing the home page
- **WHEN** the sticky CTA region renders with both a stats link and the existing log-trip link
- **THEN** both actions SHALL be visible together without one hiding the other, using the Pico grid pattern established by `.sticky-cta`

#### Scenario: Navigation uses HTMX boost

- **GIVEN** the document body has `hx-boost="true"`
- **WHEN** the user activates a sticky CTA navigation anchor
- **THEN** navigation SHALL occur via HTMX boosted request, producing a SPA-like transition without a full document reload

#### Scenario: No global top navigation bar

- **WHEN** any primary page renders
- **THEN** the document SHALL NOT contain a site-wide top navigation element; navigation SHALL be scoped to per-page sticky CTAs only

#### Scenario: Optional action icon renders when provided

- **GIVEN** a sticky CTA action is rendered with an icon name specified
- **WHEN** the action anchor renders
- **THEN** the anchor SHALL contain an icon element using the `lucide-static` font icon class for that name, placed inline with the label

#### Scenario: Action without an icon renders unchanged

- **GIVEN** a sticky CTA action is rendered without an icon name
- **WHEN** the action anchor renders
- **THEN** the anchor SHALL contain only the label and SHALL NOT contain an icon element

#### Scenario: Icon is sized and aligned with the label

- **GIVEN** a sticky CTA action is rendered with an icon name specified
- **WHEN** the action anchor renders
- **THEN** the icon SHALL be vertically centered with the label text and sized to match the button text, without shifting the label's baseline or breaking the established Pico `role="button"` layout

#### Scenario: Trip form page uses sticky CTA for back navigation

- **GIVEN** the user is viewing the trip form page at `/trips/new`
- **WHEN** the page renders
- **THEN** the page SHALL expose a sticky CTA control containing an anchor to `/` with a label identifying the home page (Back)

#### Scenario: Trip form page save action submits the form

- **GIVEN** the user is viewing the trip form page at `/trips/new`
- **WHEN** the page renders
- **THEN** the sticky CTA control SHALL contain a `type="submit"` button that submits the trip form when activated

#### Scenario: Submit action renders as a button, not an anchor

- **GIVEN** a sticky CTA action specifies `type: "submit"`
- **WHEN** the sticky CTA renders
- **THEN** the action SHALL render as a submit button (not an anchor) carrying the Pico `role="button"` styling, while actions without `type: "submit"` SHALL continue to render as anchors
