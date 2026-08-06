## MODIFIED Requirements

### Requirement: Form field ordering prioritizes manual data entry

The trip input form SHALL order fields so that values the user reads from the car screen appear first, followed by low-priority selections. The form SHALL use a phone-first two-column grid so that paired fields share a row on all viewports: row 1 holds date and the daypart segmented control side by side; row 2 holds start time and end time; row 3 holds distance and odometer; row 4 holds average speed and consumption; row 5 holds start location and end location; row 6 holds the vehicle dropdown alone at full width. The duration field SHALL NOT appear in the form — neither as an editable input, a read-only output, nor a hidden input. The server-side derivation of `duration_min` from `end_time - start_time` is unchanged.

#### Scenario: User enters car-screen data first on a phone

- **GIVEN** the user opens the trip form on a mobile viewport (≤ 768px width)
- **WHEN** the form renders
- **THEN** date, daypart, start time, end time, distance, odometer, average speed, and consumption SHALL all be visible within the first four rows, paired two per row, before locations and vehicle

#### Scenario: Duration is absent from the form

- **GIVEN** the form is rendered
- **WHEN** the form markup is inspected
- **THEN** there SHALL be no `duration_min` field — no visible output, no hidden input — and the server SHALL still derive `duration_min` from the submitted start time and end time

#### Scenario: Daypart sits beside date

- **GIVEN** the form renders on a phone
- **WHEN** the top row is examined
- **THEN** the date input and the daypart segmented control SHALL share one row, with the date input in the first column and the segmented control in the second

#### Scenario: Vehicle row is full width

- **GIVEN** the form renders on a phone
- **WHEN** the vehicle dropdown row is examined
- **THEN** the vehicle dropdown SHALL occupy the full row width alone, not share the row with another field

## ADDED Requirements

### Requirement: Sticky submit bar with back and save actions

The form SHALL anchor its submit and back actions in a single sticky bar pinned to the bottom of the viewport. The bar SHALL hold two controls in a two-column grid: a secondary Back link on the left and a primary Save trip button on the right. The bar SHALL remain visible without scrolling. The form SHALL reserve bottom padding so the sticky bar never overlaps the last form field when the form is scrolled to its end.

#### Scenario: Save and back visible without scrolling on phone

- **GIVEN** the user opens the trip form on a mobile viewport
- **WHEN** the form renders at top scroll position
- **THEN** the sticky bar containing the Back link and Save trip button SHALL be visible at the bottom of the viewport

#### Scenario: Back link is secondary, save is primary

- **GIVEN** the sticky bar is rendered
- **WHEN** the two controls are examined
- **THEN** the Back link SHALL render as a secondary control (no primary/contrast styling) and the Save trip button SHALL render as the primary control (contrast styling), each occupying half the bar width

#### Scenario: Sticky bar does not cover the vehicle field

- **GIVEN** the form is scrolled to its maximum scroll position
- **WHEN** the vehicle dropdown row and the sticky bar positions are compared
- **THEN** the bottom edge of the vehicle row SHALL sit above the top edge of the sticky bar with no overlap

### Requirement: Unit suffixes render as muted small text

Field labels that carry a unit suffix (`km`, `km/h`, `kWh/100km`) SHALL render the unit as smaller, muted text via a `<small>` element so that the label and unit remain on one line within a narrow phone column. The unit text SHALL be visually secondary to the field name.

#### Scenario: Long unit stays on one line in a phone column

- **GIVEN** the form renders on a 390px-wide viewport with two columns of ~173px each
- **WHEN** the "Consumption (kWh/100km)" label is examined
- **THEN** the label text and the unit SHALL fit on one line without wrapping, with the unit rendered smaller and muted relative to the field name

### Requirement: Phone-first two-column grid overrides Pico mobile collapse

The trip form SHALL override Pico CSS's default single-column collapse on viewports below 768px so that paired fields remain in two columns on phones. The override SHALL apply only to the trip form, not globally. The date and vehicle rows SHALL be exempt where they span full width.

#### Scenario: Two columns persist on a phone

- **GIVEN** the form renders on a 390px-wide viewport
- **WHEN** the grid columns of a paired row (e.g. distance and odometer) are measured
- **THEN** the row SHALL display two equal columns rather than collapsing to one

#### Scenario: Full-width rows stay full width on a phone

- **GIVEN** the form renders on a 390px-wide viewport
- **WHEN** the vehicle row grid is measured
- **THEN** the row SHALL display a single full-width column
