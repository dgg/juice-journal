## MODIFIED Requirements

### Requirement: Daypart auto-derived from start time with override

The form SHALL auto-derive the daypart from the start time using a threshold of 13:00 local time: start time before 13:00 SHALL select "morning"; start time at or after 13:00 SHALL select "afternoon." The daypart SHALL be presented as a segmented control with two radio options, each displaying a Lucide icon font glyph (`icon-sun` for Morning, `icon-moon` for Afternoon) instead of UTF symbol characters, that the user can override. The auto-derivation SHALL happen at render time only (based on the pre-filled or entered start time); subsequent edits to start time SHALL NOT automatically re-swap the daypart.

#### Scenario: Morning start time defaults to morning

- **GIVEN** the start time entered is 08:12 local
- **WHEN** the form renders the daypart control
- **THEN** the "Morning" option SHALL be selected and SHALL display a Lucide `icon-sun` glyph

#### Scenario: Afternoon start time defaults to afternoon

- **GIVEN** the start time entered is 16:35 local
- **WHEN** the form renders the daypart control
- **THEN** the "Afternoon" option SHALL be selected and SHALL display a Lucide `icon-moon` glyph

#### Scenario: User overrides auto-derived daypart

- **GIVEN** the start time is 08:12 (auto-derived as "morning") and the user is returning from work early
- **WHEN** the user selects the "Afternoon" option
- **THEN** the form SHALL submit `daypart=afternoon` regardless of the start time