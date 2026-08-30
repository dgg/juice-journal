## MODIFIED Requirements

### Requirement: Period switching uses HTMX partial swap

The system SHALL switch periods without a full page reload by requesting `GET /stats/fragments/charts` with the selected period, the current `date` value, and the current `yearGranularity`, and swapping the stats + charts region of the page.

#### Scenario: Partial swap on period change

- **WHEN** the user changes the period switcher
- **THEN** the system SHALL request `/stats/fragments/charts?period=<week|month|year>&date=<current>&yearGranularity=<month|week>` and replace only the stats and charts region, leaving the rest of the page intact

#### Scenario: Partial swap preserves date across period changes

- **GIVEN** the user is viewing July 2026 (`date=2026-07`)
- **WHEN** the user switches the period from month to week
- **THEN** the system SHALL request `/stats/fragments/charts?period=week&date=2026-07` and render the ISO week containing a day in July 2026

### Requirement: Year period charts are bucketed with a granularity toggle

For the year period the system SHALL NOT render one bar per trip (chart 1) or one point per trip (chart 2). It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. For chart 1, each bucket bar SHALL represent the sum of distance and duration over the trips in that bucket. For chart 2, each bucket SHALL contribute one point per line (speed and consumption) computed as the arithmetic mean of the per-trip values over the trips in that bucket. The granularity toggle SHALL render one button per value; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system, matching the period switcher mapping: `month` → `calendar-days`, `week` → `calendar-1`.

The granularity toggle SHALL render directly above the chart region, not at the top of the stats region, because it only affects chart bucketing and has no effect on the stat cards. Moving the toggle adjacent to the charts makes the causal relationship between the control and its effect visible.

#### Scenario: Year with month granularity (default)

- **GIVEN** the selected period is year and `yearGranularity` is unset or `month`
- **WHEN** the charts render
- **THEN** the distance + duration chart SHALL show at most 12 bars, one per calendar month, each summarizing that month's trips as the sum of distance and duration
- **AND** the speed + consumption chart SHALL show at most 12 points per line (one per calendar month), each summarizing that month's trips as the arithmetic mean of speed and of consumption

#### Scenario: Year with week granularity

- **GIVEN** the selected period is year and `yearGranularity` is `week`
- **WHEN** the charts render
- **THEN** the distance + duration chart SHALL show one bar per ISO week (up to 53), each summarizing that week's trips as the sum of distance and duration
- **AND** the speed + consumption chart SHALL show one point per ISO week per line, each summarizing that week's trips as the arithmetic mean of speed and of consumption

#### Scenario: Toggling year granularity

- **WHEN** the user toggles between Month and Week granularity while the period is year
- **THEN** the system SHALL request `/stats/fragments/charts?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label

#### Scenario: Granularity toggle sits above the chart region

- **GIVEN** the selected period is year and the viewport is at or above the tablet breakpoint
- **WHEN** the stats region renders
- **THEN** the year-granularity toggle SHALL appear directly above the chart canvases and below the stat cards, not between the period switcher and the period navigation control

### Requirement: Period navigation control

The system SHALL render a period navigation control below the period switcher, consisting of a native date picker flanked by previous (◀) and next (▶) stepper buttons. The picker SHALL be an `<input type="week">` for the week period, `<input type="month">` for the month period, and a `<select>` of years for the year period. Both the picker and the stepper buttons SHALL manipulate the same `date` query parameter, keeping a single source of truth for the selected period. The ◀ and ▶ buttons SHALL carry precomputed adjacent-period `date` values in their request hrefs, so each HTMX swap renders buttons that are correct for the new anchor without client-side state.

#### Scenario: Stepper navigates to previous period

- **GIVEN** the user is viewing August 2026 (`date=2026-08`)
- **WHEN** the user clicks the ◀ button
- **THEN** the system SHALL request `/stats/fragments/charts?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Stepper navigates to next period

- **GIVEN** the user is viewing June 2026 (`date=2026-06`)
- **WHEN** the user clicks the ▶ button
- **THEN** the system SHALL request `/stats/fragments/charts?period=month&date=2026-07` and render July 2026 stats with the picker value updated to `2026-07`

#### Scenario: Picker change triggers render

- **GIVEN** the user is viewing August 2026 and the picker shows `2026-08`
- **WHEN** the user selects `2026-03` in the picker and commits (e.g., taps Set on mobile)
- **THEN** the system SHALL request `/stats/fragments/charts?period=month&date=2026-03` and render March 2026 stats

#### Scenario: Picker and stepper stay in sync

- **GIVEN** the user navigated to July 2026 via the ◀ button
- **WHEN** the stats region re-renders
- **THEN** the picker SHALL display `2026-07` and the ◀ button SHALL target `date=2026-06` and the ▶ button SHALL target `date=2026-08`

#### Scenario: Clearing the picker resets to current period

- **GIVEN** the user is viewing July 2026 and the picker shows `2026-07`
- **WHEN** the user clears the picker (fires `change` with an empty value)
- **THEN** the system SHALL request `/stats/fragments/charts?period=month` without a `date` parameter and render the current month stats

#### Scenario: Year picker is a select dropdown

- **GIVEN** the selected period is year
- **WHEN** the navigation control renders
- **THEN** the picker SHALL be a `<select>` element containing selectable years, with the anchor year marked as selected
