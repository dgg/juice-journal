## MODIFIED Requirements

### Requirement: Location presets from daypart at render

The form SHALL pre-select start and end locations based on the auto-derived daypart: morning SHALL preset start location to "home" and end location to "work"; afternoon SHALL swap them (start "work", end "home"). The preset SHALL happen at render time only; the user can override either location freely. The location options SHALL be a fixed pair ("home", "work") sourced from the `location_enum` type — no database query SHALL be performed to populate or pre-select locations. If the user submits without selecting a location, the corresponding field SHALL be null.

#### Scenario: Morning commute presets home to work

- **GIVEN** the auto-derived daypart is "morning"
- **WHEN** the form renders
- **THEN** the start location dropdown SHALL be pre-selected to "home" and the end location dropdown SHALL be pre-selected to "work"

#### Scenario: Afternoon commute swaps locations

- **GIVEN** the auto-derived daypart is "afternoon"
- **WHEN** the form renders
- **THEN** the start location dropdown SHALL be pre-selected to "work" and the end location dropdown SHALL be pre-selected to "home"

#### Scenario: User overrides a preset location

- **GIVEN** the start location is pre-selected to "home"
- **WHEN** the user selects "work" from the dropdown
- **THEN** the form SHALL submit the user-selected location, not the preset

#### Scenario: Labeled location does not exist

- **GIVEN** the form is rendered
- **WHEN** the location dropdowns are populated
- **THEN** since locations are a fixed `location_enum` pair ("home", "work") sourced from the schema type — not from a database table — the concept of a "labeled location that does not exist" SHALL NOT apply; both options SHALL always be available regardless of database state

#### Scenario: No database query for location options

- **GIVEN** the form is rendered
- **WHEN** the location dropdowns are populated
- **THEN** the options SHALL be the fixed pair "home" and "work" derived from the `location_enum` type, and no query against a `locations` table SHALL be issued (the table does not exist)

### Requirement: Location selection via dropdown

The form SHALL present start and end location selection as dropdowns with exactly two options: "home" and "work", sourced from the `location_enum` type. Free-text entry of location values SHALL NOT be available. The dropdowns SHALL NOT be populated from a database query.

#### Scenario: User selects from known locations

- **GIVEN** the form renders
- **WHEN** the user opens the start location dropdown
- **THEN** the dropdown SHALL list "home" and "work" as the only selectable options, with no free-text input and no database lookup