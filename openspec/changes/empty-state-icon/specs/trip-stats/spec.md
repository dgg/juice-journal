## MODIFIED Requirements

### Requirement: Empty period renders an empty chart state

When the selected period has no trips, the system SHALL render an empty-state message in place of the canvases and SHALL NOT attempt to render empty charts. The empty state SHALL render a `circle-off` `lucide-static` font icon (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline with a "no stats" message distinct from the trips empty-state message, so the stats empty state is visually identifiable.

#### Scenario: Empty period

- **GIVEN** the selected period has no trips
- **WHEN** the stats region renders
- **THEN** the system SHALL display an empty-state message where the charts would appear, carrying a `circle-off` icon inline before the text, and SHALL render null/dash stats values

#### Scenario: Stats empty-state message differs from trips empty state

- **GIVEN** the stats page renders for a period with no trips
- **WHEN** the empty state renders
- **THEN** the message SHALL be a "no stats" message (not the home-page "No trips yet — log your first commute" message) and SHALL carry the `circle-off` icon inline before the text
