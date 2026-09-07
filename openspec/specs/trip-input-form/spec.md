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

The trip form schema (`tripFormSchema`) SHALL derive `duration` as the difference between `end_time` and `start_time` (in whole minutes) during its transform step. The form SHALL NOT send `duration` as a form field. The derived `duration` SHALL be positive; if `end_time` is not after `start_time`, the schema SHALL produce a field-level error on `end_time` rather than a zero or negative duration.

#### Scenario: Duration calculated from entered times

- **GIVEN** the user enters date 2026-08-06, start time 08:12, end time 08:47 (DK local)
- **WHEN** `tripFormSchema.safeParse` runs
- **THEN** the schema SHALL compute `duration` = 35 and include it in the transformed `TripInput`

#### Scenario: Duration not sent from the form

- **GIVEN** the form's HTML is inspected
- **WHEN** the field list is examined
- **THEN** there SHALL be no `duration` input — visible or hidden — in the form markup

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

The form SHALL pre-select start and end locations based on the auto-derived daypart: morning SHALL preset start location to "home" and end location to "work"; afternoon SHALL swap them (start "work", end "home"). The preset SHALL happen at render time only; the user can override either location freely. The location options SHALL be a fixed pair ("home", "work") sourced from the `location_enum` type — no database query SHALL be performed to populate or pre-select locations. Both `start_location` and `end_location` SHALL be required; the user MUST select a value for each.

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

The form SHALL present start and end location selection as dropdowns with exactly two options: "home" and "work", sourced from the `location_enum` type. Free-text entry of location values SHALL NOT be available. The dropdowns SHALL NOT be populated from a database query.

#### Scenario: User selects from known locations

- **GIVEN** the form renders
- **WHEN** the user opens the start location dropdown
- **THEN** the dropdown SHALL list "home" and "work" as the only selectable options, with no free-text input and no database lookup

### Requirement: Odometer monotonicity validation

The system SHALL validate that a submitted odometer reading is greater than or equal to the last recorded odometer reading for the selected vehicle. The check SHALL query the most recent trip for the vehicle and compare the submitted `odometer` against the stored value. If the submitted value is lower, the system SHALL reject the submission by returning a field-keyed error (not throwing) identifying the `odometer` field with a message indicating the reading cannot be lower than the previous reading. If no prior trip exists for the vehicle, any non-negative odometer value SHALL be accepted. For the HTML form, the rejection SHALL produce a `422` `text/html` re-rendered form with the odometer field marked invalid; for the API, the rejection SHALL continue to throw a `FOREIGN_KEY_VIOLATION` problem with `422` `application/problem+json`.

#### Scenario: Odometer reading higher than last

- **GIVEN** the last trip for vehicle V has `odometer=5200`
- **WHEN** the user submits a new trip for vehicle V with `odometer=5231`
- **THEN** the system SHALL accept the submission

#### Scenario: Odometer reading lower than last

- **GIVEN** the last trip for vehicle V has `odometer=5231`
- **WHEN** the user submits a new trip for vehicle V with `odometer=5200`
- **THEN** the system SHALL reject the submission with `422` and the odometer field SHALL carry an error message indicating the reading cannot be lower than the previous reading

#### Scenario: No prior trip for vehicle

- **GIVEN** no trips exist for vehicle V
- **WHEN** the user submits a trip for vehicle V with `odometer=100`
- **THEN** the system SHALL accept the submission

#### Scenario: Odometer field omitted

- **GIVEN** the user submits a trip without an odometer reading
- **WHEN** the handler processes the form
- **THEN** the system SHALL skip the monotonicity check and accept the submission (odometer is nullable)

### Requirement: Date and time assembled into ISO datetimes with local offset

The trip form schema (`tripFormSchema`) SHALL combine the shared date input with the start time and end time inputs into ISO 8601 datetime strings carrying the `DISPLAY_TZ` offset (e.g. `+02:00`), preserving the local-time origin of the form values. The assembly SHALL use Luxon with `DISPLAY_TZ` (default `Europe/Copenhagen`) as the zone, then emit the ISO string with the local offset (NOT converted to UTC `Z`). The schema's transform step SHALL normalize the offset to UTC. The schema SHALL NOT pre-convert to UTC before the transform.

#### Scenario: Date and time combined with local offset

- **GIVEN** the form submits date=2026-08-06, start_time=08:12, end_time=08:47 and `DISPLAY_TZ=Europe/Copenhagen` (UTC+2 in August)
- **WHEN** `tripFormSchema.safeParse` runs the transform
- **THEN** it SHALL produce `start_time` and `end_time` as ISO 8601 strings with offset `+02:00` representing 08:12 and 08:47 Copenhagen local on 2026-08-06, and SHALL NOT emit a `Z` suffix

#### Scenario: Schema transform normalizes offset to UTC

- **GIVEN** the schema has produced `start_time="2026-08-06T08:12:00.000+02:00"`
- **WHEN** the transform completes
- **THEN** the resulting `DateTime` SHALL have zone `UTC` and represent the same instant as `2026-08-06T06:12:00.000Z`

### Requirement: Trip form schema derived from form field strings

A `tripFormSchema` SHALL be defined in `src/backend/types.ts` using Zod, modeling the form's actual string fields (`trip_date`, `start_time` as `HH:mm`, `end_time` as `HH:mm`, `distance` as string, etc.) and reusing shared leaves (`nanoid`, `daypart`, `location`) from the existing `tripInputSchema`. The schema SHALL transform the string inputs into the `TripInput` shape (ISO datetimes with `DISPLAY_TZ` offset, computed `duration` in minutes, parsed numbers). The schema SHALL enforce `distance > 0` after the string-to-number transform and SHALL reject `end_time` before `start_time` with a field-level error on `end_time`.

#### Scenario: Valid form input transforms to TripInput

- **GIVEN** the form submits `trip_date=2026-08-06`, `start_time=08:12`, `end_time=08:47`, `distance=12.5` with `DISPLAY_TZ=Europe/Copenhagen`
- **WHEN** `tripFormSchema.safeParse` runs
- **THEN** the parsed output SHALL contain ISO datetimes with the Copenhagen offset, `duration=35`, `distance=12.5`, and the value SHALL be typed as `TripInput`

#### Scenario: End time before start time rejected with field error

- **GIVEN** the form submits `start_time=08:47` and `end_time=08:12` on the same date
- **WHEN** `tripFormSchema.safeParse` runs
- **THEN** the result SHALL be a failure with an issue whose path references `end_time` and whose message indicates it must be after the start time

#### Scenario: Non-positive distance rejected after transform

- **GIVEN** the form submits `distance=0`
- **WHEN** `tripFormSchema.safeParse` runs
- **THEN** the result SHALL be a failure with an issue whose path references `distance` and whose message indicates it must be greater than 0

### Requirement: Schema validation middleware renders form with errors

The HTML trip form submission (`POST /trips`) SHALL be validated by a middleware that runs a Zod `safeParse` against a form-specific schema (`tripFormSchema`) modeling the actual form fields as strings (`trip_date`, `start_time` as `HH:mm`, `end_time` as `HH:mm`, `distance` as string, etc.) and transforming them into the `TripInput` shape. On schema failure, the middleware SHALL respond `422` with `text/html` re-rendering `TripFormPage` with the submitted values repopulated and a field-error map derived from the Zod issues. The middleware SHALL NOT throw; it SHALL render and return. The handler SHALL NOT execute on schema failure.

#### Scenario: Missing required distance renders error

- **GIVEN** the user submits the trip form with the distance field empty
- **WHEN** the schema validation middleware runs `safeParse`
- **THEN** the system SHALL respond `422` with `text/html`, the distance input SHALL carry `aria-invalid="true"` and an associated `<small>` error message, and all other submitted values SHALL be repopulated

#### Scenario: Invalid start time format renders error

- **GIVEN** the user submits `start_time` as a non-time string
- **WHEN** the schema validation middleware runs `safeParse`
- **THEN** the system SHALL respond `422` with `text/html` re-rendering the form with the start time field marked invalid and a descriptive message, and the submitted value preserved

#### Scenario: Handler does not execute on schema failure

- **GIVEN** the schema validation middleware detects a validation failure
- **WHEN** the middleware renders the form with errors
- **THEN** the trip creation handler SHALL NOT execute and no trip SHALL be inserted

### Requirement: Consistency validation middleware renders form with errors

A consistency validation middleware SHALL run AFTER the schema middleware and BEFORE the creation handler. It SHALL execute return-based form validators (vehicle existence, trip uniqueness, odometer monotonicity) that return a collection of field-keyed errors rather than throwing. If any consistency errors are returned, the middleware SHALL respond `422` with `text/html` re-rendering `TripFormPage` with the submitted values repopulated and the consistency errors wired to the offending fields. The middleware SHALL NOT throw or catch; it SHALL check the returned error collection and render or proceed. The creation handler SHALL NOT execute on consistency failure.

#### Scenario: Non-existent vehicle renders error

- **GIVEN** the user submits a trip with a `vehicle_id` that does not exist in the vehicles table
- **WHEN** the consistency validation middleware runs the vehicle existence check
- **THEN** the system SHALL respond `422` with `text/html`, the vehicle dropdown SHALL carry `aria-invalid="true"` and an associated `<small>` error message, and all other submitted values SHALL be repopulated

#### Scenario: Odometer lower than previous reading renders error

- **GIVEN** the last trip for the selected vehicle has `odometer=5231` and the user submits `odometer=5200`
- **WHEN** the consistency validation middleware runs the odometer monotonicity check
- **THEN** the system SHALL respond `422` with `text/html` with the odometer field marked invalid and a message indicating the reading cannot be lower than the previous one

#### Scenario: Duplicate trip renders error on offending fields

- **GIVEN** a trip already exists for `vehicle_id` X with `end_time` T and the user submits the same combination
- **WHEN** the consistency validation middleware runs the uniqueness check
- **THEN** the system SHALL respond `422` with `text/html` with the `end_time` field marked invalid and a descriptive message, and the submitted values SHALL be repopulated

#### Scenario: Consistency passes and handler executes

- **GIVEN** the user submits a structurally valid trip with an existing vehicle, no duplicate, and a valid odometer
- **WHEN** the consistency validation middleware runs all checks and finds no errors
- **THEN** the middleware SHALL proceed to the creation handler, which SHALL insert the trip and respond with `HX-Redirect: /`

### Requirement: Form validation errors surface via Pico CSS validation states

Each invalid form field SHALL carry `aria-invalid="true"` (triggering Pico CSS's native invalid-border styling via `--pico-form-element-invalid-border-color`) and `aria-describedby` pointing to a `<small>` element containing the field's error message. The `<small>` error message SHALL be associated with its input via matching `id`/`aria-describedby` attributes. Error message text color SHALL be grounded in a `--pico-*` custom property override in `public/app.css`; no inline `<style>` blocks SHALL appear in the form component.

#### Scenario: Invalid field shows Pico error styling

- **GIVEN** the form is re-rendered with an error on the distance field
- **WHEN** the distance input's attributes are inspected
- **THEN** it SHALL carry `aria-invalid="true"` and `aria-describedby` referencing a `<small>` element whose text content is the error message

#### Scenario: Valid field has no error styling

- **GIVEN** the form is re-rendered with an error only on the distance field
- **WHEN** the start time input's attributes are inspected
- **THEN** it SHALL NOT carry `aria-invalid` and no error `<small>` SHALL be associated with it

### Requirement: Form re-render repopulates submitted values

When the form is re-rendered after a validation failure, every submitted value SHALL be preserved in its corresponding input: text/number/time/date inputs SHALL carry the submitted value in their `value` attribute; selects SHALL mark the submitted option as `selected`; radio buttons SHALL mark the submitted option as `checked`. Values the user did not submit SHALL remain at their render-time defaults (current time, current date, daypart-derived locations).

#### Scenario: Submitted distance preserved on re-render

- **GIVEN** the user submitted `distance=12.5` and the form fails validation on another field
- **WHEN** the form is re-rendered with errors
- **THEN** the distance input SHALL have `value="12.5"`

#### Scenario: Submitted vehicle selection preserved on re-render

- **GIVEN** the user selected vehicle "Tesla M3" and the form fails validation on another field
- **WHEN** the form is re-rendered with errors
- **THEN** the vehicle dropdown SHALL have the "Tesla M3" option marked `selected`

### Requirement: Form uses outerHTML swap for error re-render

The trip form SHALL carry `hx-swap="outerHTML"` so that a `422` HTML response replaces the entire form element in place. On success, the handler SHALL set `HX-Redirect: /` as before. No client-side JavaScript SHALL be required for the validation flow.

#### Scenario: 422 response swaps the form in place

- **GIVEN** the user submits the form via HTMX and validation fails
- **WHEN** the `422` HTML response arrives
- **THEN** HTMX SHALL replace the existing form element with the re-rendered form (with errors), and the page SHALL not navigate away

#### Scenario: Success response redirects

- **GIVEN** the user submits a valid trip via HTMX
- **WHEN** the handler responds with `HX-Redirect: /`
- **THEN** the browser SHALL navigate to the home page

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
