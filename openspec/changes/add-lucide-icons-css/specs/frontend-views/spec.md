## MODIFIED Requirements

### Requirement: Layout composition

The system SHALL provide a single `Layout` component that emits `<!DOCTYPE html>`, `<head>` (including Pico CSS, the Lucide icon font CSS, and the application stylesheet), and `<body>` wrapping page children. All full pages SHALL be composed through `Layout`; fragment routes SHALL bypass `Layout` and return bare components. The Lucide icon font SHALL be loaded via a single `<link rel="stylesheet">` to `lucide-static` (CDN, pinned version with SRI integrity hash); no Lucide JavaScript SHALL be shipped. The HTMX library SHALL remain loaded via its CDN `<script>` as before.

#### Scenario: Page wraps in Layout

- **WHEN** a full page route renders
- **THEN** the response document SHALL include the shared `<head>` (Pico + Lucide icon font CSS + app.css) and the page content as `Layout` children

#### Scenario: Fragment bypasses Layout

- **WHEN** a fragment route responds
- **THEN** the response SHALL contain only the bare fragment markup, no full HTML document or repeated `<head>`

#### Scenario: No Lucide JavaScript shipped

- **WHEN** the page HTML is inspected
- **THEN** the `<head>` SHALL contain a Lucide icon font CSS `<link>` and SHALL NOT contain any Lucide JavaScript `<script>` tag

## ADDED Requirements

### Requirement: DOM icons use the Lucide icon font

Icons rendered in the DOM (view components, not Chart.js canvas) SHALL use Lucide icon font CSS classes (e.g., `icon-sun`, `icon-moon`, `icon-chevron-left`, `icon-chevron-right`) rather than UTF symbol characters. Icons SHALL be rendered as `<span>` elements with the appropriate `icon-*` class, inheriting color via `currentColor` and sizing via the surrounding context or `app.css` rules. UTF symbol characters SHALL be used ONLY inside Chart.js canvas-rendered content (axis labels, tooltips) where DOM/CSS rendering cannot reach.

#### Scenario: Daypart indicator uses Lucide icon

- **GIVEN** a trip row displays a daypart indicator in the DOM
- **WHEN** the indicator is rendered
- **THEN** it SHALL use a `<span>` with class `icon-sun` (morning) or `icon-moon` (afternoon), not a UTF `☀` or `🌙` character

#### Scenario: Period stepper uses Lucide icons

- **GIVEN** the stats period navigation stepper renders previous and next buttons
- **WHEN** the buttons are inspected
- **THEN** they SHALL contain `<span>` elements with `icon-chevron-left` and `icon-chevron-right` classes, not UTF `◀` or `▶` characters

#### Scenario: Chart canvas labels keep UTF symbols

- **GIVEN** the stats chart renders x-axis labels on the Chart.js canvas
- **WHEN** the axis labels are drawn
- **THEN** daypart indicators in those labels SHALL remain UTF symbol characters (e.g., `☀`, `🌙`), since canvas `fillText` cannot render CSS `::before` pseudo-elements or DOM-injected SVGs