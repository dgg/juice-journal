## MODIFIED Requirements

### Requirement: Empty state handling

The system SHALL display appropriate messaging when no trips exist for the current month. The empty state SHALL render a `circle-off` `lucide-static` font icon (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline with the message text.

#### Scenario: Empty state display

- **WHEN** user visits the home page and no trips exist for current month
- **THEN** system displays "No trips yet — log your first commute" message with a `circle-off` icon rendered inline before the text, with a pointer to CTA

#### Scenario: Empty state icon is sized and aligned with the text

- **GIVEN** the home page renders the empty state
- **WHEN** the empty state renders
- **THEN** the `circle-off` icon SHALL be vertically centered with the message text and sized to match the message text, without shifting the text baseline
