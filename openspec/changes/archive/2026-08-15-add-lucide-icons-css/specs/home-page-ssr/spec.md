## MODIFIED Requirements

### Requirement: Home page displays trip list

The system SHALL render a list of trips for the current calendar month, ordered with newest trips first. Each trip row SHALL display a daypart indicator rendered as a Lucide icon font glyph (`icon-sun` for morning, `icon-moon` for afternoon) in the DOM, not a UTF symbol character.

#### Scenario: Successful trip list display

- **WHEN** user visits the home page `/` and trips exist for current month
- **THEN** system displays a list of trips ordered by newest first, showing date, time range, a Lucide icon daypart indicator (`icon-sun` or `icon-moon`), and consumption