## MODIFIED Requirements

### Requirement: Period navigation control

The system SHALL render a period navigation control below the period switcher, consisting of a native date picker flanked by previous and next stepper buttons. The picker SHALL be an `<input type="week">` for the week period, `<input type="month">` for the month period, and a `<select>` of years for the year period. Both the picker and the stepper buttons SHALL manipulate the same `date` query parameter, keeping a single source of truth for the selected period. The previous and next stepper buttons SHALL display Lucide icon font glyphs (`icon-chevron-left` and `icon-chevron-right` respectively) instead of UTF symbol characters, and SHALL carry precomputed adjacent-period `date` values in their request hrefs, so each HTMX swap renders buttons that are correct for the new anchor without client-side state.

#### Scenario: Stepper navigates to previous period

- **GIVEN** the user is viewing August 2026 (`date=2026-08`)
- **WHEN** the user clicks the previous stepper button (displaying `icon-chevron-left`)
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Stepper navigates to next period

- **GIVEN** the user is viewing June 2026 (`date=2026-06`)
- **WHEN** the user clicks the next stepper button (displaying `icon-chevron-right`)
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Picker change triggers render

- **GIVEN** the user is viewing August 2026 and the picker shows `2026-08`
- **WHEN** the user selects `2026-03` in the picker and commits (e.g., taps Set on mobile)
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-03` and render March 2026 stats

#### Scenario: Picker and stepper stay in sync

- **GIVEN** the user navigated to July 2026 via the previous stepper button
- **WHEN** the stats region re-renders
- **THEN** the picker SHALL display `2026-07` and the previous stepper SHALL target `date=2026-06` and the next stepper SHALL target `date=2026-08`

#### Scenario: Clearing the picker resets to current period

- **GIVEN** the user is viewing July 2026 and the picker shows `2026-07`
- **WHEN** the user clears the picker (fires `change` with an empty value)
- **THEN** the system SHALL request `/partials/trip-stats?period=month` without a `date` parameter and render the current month stats

#### Scenario: Year picker is a select dropdown

- **GIVEN** the selected period is year
- **WHEN** the navigation control renders
- **THEN** the picker SHALL be a `<select>` element containing selectable years, with the anchor year marked as selected