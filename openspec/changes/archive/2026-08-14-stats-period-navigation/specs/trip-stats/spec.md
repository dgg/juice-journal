## MODIFIED Requirements

### Requirement: Period selection switches week, month, and year

The system SHALL let the user select a period of `week`, `month`, or `year`. The week period SHALL cover an ISO week (Monday 00:00 to next Monday 00:00) in the display timezone; the month period SHALL cover a calendar month; the year period SHALL cover a calendar year. When a `date` query parameter is present, period bounds SHALL be computed relative to the period containing that date; when absent, bounds SHALL default to the current period. All bounds SHALL be computed in the display timezone and applied to `trips.end_time` as UTC. The `date` parameter SHALL accept ISO week format (`YYYY-Www`) for the week period, `YYYY-MM` for the month period, and `YYYY` for the year period.

#### Scenario: Switching to week

- **WHEN** the user selects the `week` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current ISO week (Monday inclusive to next Monday exclusive) in the display timezone

#### Scenario: Switching to year

- **WHEN** the user selects the `year` period on the stats page
- **THEN** the stats and charts SHALL update to reflect trips whose `end_time` falls within the current calendar year in the display timezone

#### Scenario: Viewing a past period via date parameter

- **GIVEN** the user is viewing the month period and the current month is August 2026
- **WHEN** the user navigates to `/stats?period=month&date=2026-07`
- **THEN** the stats and charts SHALL reflect trips whose `end_time` falls within July 2026 in the display timezone, and the period label SHALL display "July 2026"

#### Scenario: Defaulting to current period when date is absent

- **WHEN** the user visits `/stats?period=week` without a `date` parameter
- **THEN** the system SHALL compute bounds for the current ISO week

#### Scenario: Invalid date parameter

- **WHEN** the user visits `/stats?period=month&date=not-a-date`
- **THEN** the system SHALL respond with a 400 error indicating the date parameter is invalid

### Requirement: Period switching uses HTMX partial swap

The system SHALL switch periods without a full page reload by requesting `GET /partials/trip-stats` with the selected period, the current `date` value, and the current `yearGranularity`, and swapping the stats + charts region of the page.

#### Scenario: Partial swap on period change

- **WHEN** the user changes the period switcher
- **THEN** the system SHALL request `/partials/trip-stats?period=<week|month|year>&date=<current>&yearGranularity=<month|week>` and replace only the stats and charts region, leaving the rest of the page intact

#### Scenario: Partial swap preserves date across period changes

- **GIVEN** the user is viewing July 2026 (`date=2026-07`)
- **WHEN** the user switches the period from month to week
- **THEN** the system SHALL request `/partials/trip-stats?period=week&date=2026-07` and render the ISO week containing a day in July 2026

### Requirement: Previous-period deltas are shown for each stat

The system SHALL display a delta for each stat comparing the selected period to the previous equivalent period (previous ISO week, previous calendar month, previous calendar year), relative to the anchor date — not relative to the current date. When no `date` parameter is present, the delta SHALL compare the current period to the previous current period. The delta SHALL use the same delta-indicator pattern as the home page.

#### Scenario: Delta vs previous period for current period

- **GIVEN** current month total distance is 200 km and previous month total distance was 150 km
- **WHEN** the user views the current month period
- **THEN** the total-distance stat SHALL display an upward delta indicating +50 km versus the previous month

#### Scenario: Delta follows selected past period

- **GIVEN** July 2026 total distance is 180 km and June 2026 total distance was 220 km
- **WHEN** the user views July 2026 (`date=2026-07`)
- **THEN** the total-distance stat SHALL display a downward delta indicating -40 km versus June 2026

#### Scenario: No previous-period data

- **GIVEN** the previous period relative to the anchor has no trips
- **WHEN** the user views the selected period
- **THEN** the delta indicators SHALL render a neutral/empty state rather than a numeric delta

## ADDED Requirements

### Requirement: Period navigation control

The system SHALL render a period navigation control below the period switcher, consisting of a native date picker flanked by previous (◀) and next (▶) stepper buttons. The picker SHALL be an `<input type="week">` for the week period, `<input type="month">` for the month period, and a `<select>` of years for the year period. Both the picker and the stepper buttons SHALL manipulate the same `date` query parameter, keeping a single source of truth for the selected period. The ◀ and ▶ buttons SHALL carry precomputed adjacent-period `date` values in their request hrefs, so each HTMX swap renders buttons that are correct for the new anchor without client-side state.

#### Scenario: Stepper navigates to previous period

- **GIVEN** the user is viewing August 2026 (`date=2026-08`)
- **WHEN** the user clicks the ◀ button
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Stepper navigates to next period

- **GIVEN** the user is viewing June 2026 (`date=2026-06`)
- **WHEN** the user clicks the ▶ button
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Picker change triggers render

- **GIVEN** the user is viewing August 2026 and the picker shows `2026-08`
- **WHEN** the user selects `2026-03` in the picker and commits (e.g., taps Set on mobile)
- **THEN** the system SHALL request `/partials/trip-stats?period=month&date=2026-03` and render March 2026 stats

#### Scenario: Picker and stepper stay in sync

- **GIVEN** the user navigated to July 2026 via the ◀ button
- **WHEN** the stats region re-renders
- **THEN** the picker SHALL display `2026-07` and the ◀ button SHALL target `date=2026-06` and the ▶ button SHALL target `date=2026-08`

#### Scenario: Clearing the picker resets to current period

- **GIVEN** the user is viewing July 2026 and the picker shows `2026-07`
- **WHEN** the user clears the picker (fires `change` with an empty value)
- **THEN** the system SHALL request `/partials/trip-stats?period=month` without a `date` parameter and render the current month stats

#### Scenario: Year picker is a select dropdown

- **GIVEN** the selected period is year
- **WHEN** the navigation control renders
- **THEN** the picker SHALL be a `<select>` element containing selectable years, with the anchor year marked as selected

### Requirement: Future period navigation is disabled

The system SHALL disable the ▶ (next) button when the anchor period is the current period or a future period. The system SHALL NOT render stats for a future period via the navigation control.

#### Scenario: Next button disabled at current period

- **GIVEN** the user is viewing the current month (August 2026)
- **WHEN** the stats region renders
- **THEN** the ▶ button SHALL be disabled

#### Scenario: Next button enabled for past period

- **GIVEN** the user is viewing June 2026 and the current month is August 2026
- **WHEN** the stats region renders
- **THEN** the ▶ button SHALL be enabled and target `date=2026-07`
