## ADDED Requirements

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

## MODIFIED Requirements

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
