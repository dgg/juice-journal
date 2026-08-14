## ADDED Requirements

### Requirement: Cross-page navigation via sticky CTA controls

Each primary page (home, stats) SHALL expose a sticky bottom-anchored navigation control that links to the other primary page. The control SHALL follow the existing sticky CTA visual pattern (Pico `role="button"` anchors inside a `.sticky-cta` container) and SHALL NOT introduce a global top navigation bar. The trip form page is out of scope; its existing `Back` anchor in `.sticky-submit` remains unchanged.

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
- **THEN** both actions SHALL be visible together without one hiding the other, using the Pico grid pattern already established by `.sticky-submit`

#### Scenario: Navigation uses HTMX boost

- **GIVEN** the document body has `hx-boost="true"`
- **WHEN** the user activates a sticky CTA navigation anchor
- **THEN** navigation SHALL occur via HTMX boosted request, producing a SPA-like transition without a full document reload

#### Scenario: No global top navigation bar

- **WHEN** any primary page renders
- **THEN** the document SHALL NOT contain a site-wide top navigation element; navigation SHALL be scoped to per-page sticky CTAs only
