## MODIFIED Requirements

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
