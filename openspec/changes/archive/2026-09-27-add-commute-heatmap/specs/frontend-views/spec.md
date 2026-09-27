# Spec Delta

## MODIFIED Requirements

### Requirement: Views are server-rendered JSX components

The system SHALL render all HTML via `hono/jsx` server-side components located under `src/frontend/`. No HTML SHALL be produced as inline template strings in backend handlers. Components SHALL NOT ship any client-side JavaScript runtime; only HTMX attributes and the HTMX library may run in the browser.

#### Scenario: Backend handler delegates to a view component

- **WHEN** a backend handler responds with HTML
- **THEN** it SHALL fetch data and return `c.html(<Component .../>)`, performing no string interpolation of markup

#### Scenario: No client JS framework shipped

- **WHEN** a page is rendered and served to the browser
- **THEN** the response SHALL contain no React/Vue/Svelte client runtime; HTMX library + optional Pico/Chart.js/FullCalendar assets only
