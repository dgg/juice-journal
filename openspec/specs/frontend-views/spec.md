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

The system SHALL maintain a single pure-CSS file at `public/app.css` served statically. All custom CSS SHALL live in this file; inline `<style>` blocks SHALL NOT appear in any view component. CSS SHALL be applied in order of preference: (1) native Pico styling or semantic HTML, (2) overriding `--pico-*` custom properties or extending Pico classes, (3) custom rules in `app.css` only when no Pico path exists.

#### Scenario: No inline styles in components

- **WHEN** a view component requires styling beyond native Pico
- **THEN** the styling SHALL be expressed in `public/app.css`, never via an inline `<style>` block in the component

#### Scenario: Stylesheet served statically

- **WHEN** the browser requests `/static/app.css`
- **THEN** the server SHALL return the contents of `public/app.css` with a CSS content type, loaded after Pico so app rules win the cascade

### Requirement: Automatic HTML escaping

The system SHALL rely on JSX's automatic output escaping for all interpolated values. Manual HTML-escape helper functions SHALL NOT be present in the view layer.

#### Scenario: Dynamic text is escaped

- **WHEN** a component renders user-supplied or dynamic text
- **THEN** the value SHALL be escaped automatically by JSX; no explicit `escapeHtml` call SHALL be required
