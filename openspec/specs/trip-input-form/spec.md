# trip-input-form

## Purpose

Defines the mobile-first trip entry form: field set, defaults, server-side derivation of duration and daypart, location presets, vehicle and location dropdowns, and odometer monotonicity validation.

## Requirements

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

### Requirement: End time defaults to current local time at render

The form SHALL pre-populate the end time field with the current local time (resolved via `DISPLAY_TZ`, default `Europe/Copenhagen`) at the moment the form is rendered. The time SHALL be a snapshot taken server-side; it SHALL NOT update after the page loads. The date field SHALL default to the same snapshot's calendar date.

#### Scenario: Form opened in the afternoon

- **GIVEN** the current local time is 16:35 in `Europe/Copenhagen`
- **WHEN** the user opens the trip form
- **THEN** the end time field SHALL be pre-filled with 16:35 and the date field SHALL be pre-filled with today's date

#### Scenario: User edits the pre-filled end time

- **GIVEN** the form is rendered with end time pre-filled to 16:35
- **WHEN** the user changes the end time to 16:40
- **THEN** the duration field SHALL remain read-only and reflect the new difference between the edited end time and the start time upon submission

### Requirement: Separate date and time inputs

The form SHALL present date and time as separate inputs. A single shared date input SHALL apply to both start and end times, assuming same-day trips. No overnight trip handling SHALL be provided.

#### Scenario: Single date field for both times

- **GIVEN** the user is filling the trip form
- **WHEN** the form renders
- **THEN** there SHALL be one date input, one start time input, and one end time input — not two datetime-local inputs

### Requirement: Duration derived server-side from end time minus start time

The HTML form handler SHALL derive `duration_min` as the difference between `end_time` and `start_time` (in whole minutes) before schema validation and trip insertion. The form SHALL NOT send `duration_min` as a form field. The `tripInputSchema` SHALL remain unchanged (still requires `duration_min`); the handler SHALL inject the derived value before calling `.parse()`.

#### Scenario: Duration calculated from entered times

- **GIVEN** the user enters date 2026-08-06, start time 08:12, end time 08:47 (DK local)
- **WHEN** the form is submitted
- **THEN** the handler SHALL compute `duration_min` = 35 and pass it to `tripInputSchema.parse()` along with the assembled ISO datetimes

#### Scenario: Duration not sent from the form

- **GIVEN** the form's HTML is inspected
- **WHEN** the field list is examined
- **THEN** there SHALL be no `duration_min` input — visible or hidden — in the form markup

### Requirement: Daypart auto-derived from start time with override

The form SHALL auto-derive the daypart from the start time using a threshold of 13:00 local time: start time before 13:00 SHALL select "morning"; start time at or after 13:00 SHALL select "afternoon." The daypart SHALL be presented as a segmented control with two radio options (☀ Morning, ☾ Afternoon) that the user can override. The auto-derivation SHALL happen at render time only (based on the pre-filled or entered start time); subsequent edits to start time SHALL NOT automatically re-swap the daypart.

#### Scenario: Morning start time defaults to morning

- **GIVEN** the start time entered is 08:12 local
- **WHEN** the form renders the daypart control
- **THEN** the "Morning" option SHALL be selected

#### Scenario: Afternoon start time defaults to afternoon

- **GIVEN** the start time entered is 16:35 local
- **WHEN** the form renders the daypart control
- **THEN** the "Afternoon" option SHALL be selected

#### Scenario: User overrides auto-derived daypart

- **GIVEN** the start time is 08:12 (auto-derived as "morning") and the user is returning from work early
- **WHEN** the user selects the "Afternoon" option
- **THEN** the form SHALL submit `daypart=afternoon` regardless of the start time

### Requirement: Location presets from daypart at render

The form SHALL pre-select start and end locations based on the auto-derived daypart: morning SHALL preset start location to the location labeled "home" and end location to the location labeled "work"; afternoon SHALL swap them (start "work", end "home"). The preset SHALL happen at render time only; the user can override either location freely via a dropdown. If a labeled location does not exist, the corresponding dropdown SHALL default to empty.

#### Scenario: Morning commute presets home to work

- **GIVEN** the auto-derived daypart is "morning" and locations labeled "home" and "work" exist
- **WHEN** the form renders
- **THEN** the start location dropdown SHALL be pre-selected to "home" and the end location dropdown SHALL be pre-selected to "work"

#### Scenario: Afternoon commute swaps locations

- **GIVEN** the auto-derived daypart is "afternoon" and locations labeled "home" and "work" exist
- **WHEN** the form renders
- **THEN** the start location dropdown SHALL be pre-selected to "work" and the end location dropdown SHALL be pre-selected to "home"

#### Scenario: User overrides a preset location

- **GIVEN** the start location is pre-selected to "home"
- **WHEN** the user selects a different location from the dropdown
- **THEN** the form SHALL submit the user-selected location, not the preset

#### Scenario: Labeled location does not exist

- **GIVEN** no location with label "home" exists in the database
- **WHEN** the form renders
- **THEN** the start location dropdown SHALL default to empty (no pre-selection)

### Requirement: Vehicle dropdown defaulting to last-used vehicle

The form SHALL present vehicle selection as a dropdown listing all vehicles, using each vehicle's `description` as the display label. The default selection SHALL be the vehicle from the most recent trip (by `end_time`); if no trips exist, the default SHALL be the first vehicle (or only vehicle). If no vehicles exist, the dropdown SHALL be empty.

#### Scenario: Default to last trip's vehicle

- **GIVEN** a trip exists with `vehicle_id` V and `end_time` is the most recent, and vehicle V has description "Tesla M3"
- **WHEN** the form renders
- **THEN** the vehicle dropdown SHALL default to "Tesla M3"

#### Scenario: No trips exist defaults to first vehicle

- **GIVEN** no trips exist and two vehicles exist with descriptions "Car A" and "Car B"
- **WHEN** the form renders
- **THEN** the vehicle dropdown SHALL default to the first vehicle returned by the query

### Requirement: Location selection via dropdown

The form SHALL present start and end location selection as dropdowns listing all locations, using each location's `label` as the display text. Free-text entry of location IDs SHALL NOT be available.

#### Scenario: User selects from known locations

- **GIVEN** three locations exist with labels "home", "work", "gym"
- **WHEN** the user opens the start location dropdown
- **THEN** the dropdown SHALL list "home", "work", and "gym" as selectable options, with no free-text input

### Requirement: Odometer monotonicity validation

The system SHALL validate that a submitted odometer reading is greater than or equal to the last recorded odometer reading for the selected vehicle. The check SHALL query the most recent trip for the vehicle and compare the submitted `odometer_km` against the stored value. If the submitted value is lower, the system SHALL reject the submission with a `422` `application/problem+json` response identifying the `odometer_km` field. If no prior trip exists for the vehicle, any non-negative odometer value SHALL be accepted.

#### Scenario: Odometer reading higher than last

- **GIVEN** the last trip for vehicle V has `odometer_km=5200`
- **WHEN** the user submits a new trip for vehicle V with `odometer_km=5231`
- **THEN** the system SHALL accept the submission

#### Scenario: Odometer reading lower than last

- **GIVEN** the last trip for vehicle V has `odometer_km=5231`
- **WHEN** the user submits a new trip for vehicle V with `odometer_km=5200`
- **THEN** the system SHALL reject the submission with `422` and a `detail` indicating the odometer reading cannot be lower than the previous reading

#### Scenario: No prior trip for vehicle

- **GIVEN** no trips exist for vehicle V
- **WHEN** the user submits a trip for vehicle V with `odometer_km=100`
- **THEN** the system SHALL accept the submission

#### Scenario: Odometer field omitted

- **GIVEN** the user submits a trip without an odometer reading
- **WHEN** the handler processes the form
- **THEN** the system SHALL skip the monotonicity check and accept the submission (odometer is nullable)

### Requirement: Date and time assembled into ISO datetimes with local offset

The HTML form handler SHALL combine the shared date input with the start time and end time inputs into ISO 8601 datetime strings carrying the `DISPLAY_TZ` offset (e.g. `+02:00`), preserving the local-time origin of the form values. The assembly SHALL use Luxon with `DISPLAY_TZ` (default `Europe/Copenhagen`) as the zone, then emit the ISO string with the local offset (NOT converted to UTC `Z`). The schema's transform step SHALL normalize the offset to UTC. The form handler SHALL NOT pre-convert to UTC; it SHALL hand the offset-bearing string to `tripInputSchema.parse()`.

#### Scenario: Date and time combined with local offset

- **GIVEN** the form submits date=2026-08-06, start_time=08:12, end_time=08:47 and `DISPLAY_TZ=Europe/Copenhagen` (UTC+2 in August)
- **WHEN** the handler assembles the datetimes
- **THEN** it SHALL produce `start_time` and `end_time` as ISO 8601 strings with offset `+02:00` representing 08:12 and 08:47 Copenhagen local on 2026-08-06, and SHALL NOT emit a `Z` suffix

#### Scenario: Schema transform normalizes offset to UTC

- **GIVEN** the handler has produced `start_time="2026-08-06T08:12:00.000+02:00"`
- **WHEN** `tripInputSchema.parse()` runs the transform
- **THEN** the resulting `DateTime` SHALL have zone `UTC` and represent the same instant as `2026-08-06T06:12:00.000Z`

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

### Requirement: Daypart selected state carries daypart-specific hue

The daypart segmented control SHALL render each selected option in a hue that corresponds to its daypart, matching the color family used by the trip listing's daypart indicator. The selected "Morning" option SHALL use an amber background with an amber icon color; the selected "Afternoon" option SHALL use an indigo background with an indigo icon color. The unselected option SHALL remain visually neutral (default background, muted text and border). Each selected option's border SHALL use the same hue at a step-up shade so the filled button has a crisp edge against the unselected neighbor.

#### Scenario: Morning selected shows amber

- **GIVEN** the trip form renders with the "Morning" daypart option selected
- **WHEN** the selected option's visual styling is examined
- **THEN** its background SHALL use the amber color family and its icon/text SHALL use an amber shade, matching the listing's morning daypart indicator

#### Scenario: Afternoon selected shows indigo

- **GIVEN** the trip form renders with the "Afternoon" daypart option selected
- **WHEN** the selected option's visual styling is examined
- **THEN** its background SHALL use the indigo color family and its icon/text SHALL use an indigo shade, matching the listing's afternoon daypart indicator

#### Scenario: Unselected option stays neutral

- **GIVEN** the "Morning" option is selected and the "Afternoon" option is not (or vice versa)
- **WHEN** the unselected option's visual styling is examined
- **THEN** it SHALL render with the default background color and muted text/border, unchanged from the current unselected styling

#### Scenario: Selected and unselected are visually distinguishable side by side

- **GIVEN** the form renders on a phone with one daypart option selected
- **WHEN** both options are viewed side by side in the segmented control
- **THEN** the selected option SHALL be visually distinct from the unselected option through background fill and hue, and the two selected states (morning vs afternoon) SHALL be distinguishable from each other by hue family
