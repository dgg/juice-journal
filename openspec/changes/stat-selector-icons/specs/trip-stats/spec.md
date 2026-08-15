## MODIFIED Requirements

### Requirement: Period selection switches week, month, and year

The system SHALL let the user select a period of `week`, `month`, or `year`. The week period SHALL cover an ISO week (Monday 00:00 to next Monday 00:00) in the display timezone; the month period SHALL cover a calendar month; the year period SHALL cover a calendar year. When a `date` query parameter is present, period bounds SHALL be computed relative to the period containing that date; when absent, bounds SHALL default to the current period. All bounds SHALL be computed in the display timezone and applied to `trips.end_time` as UTC. The `date` parameter SHALL accept ISO week format (`YYYY-Www`) for the week period, `YYYY-MM` for the month period, and `YYYY` for the year period. The period switcher SHALL render one button per period; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system (`<span class="icon-<name>" aria-hidden="true"></span>`): `week` → `calendar-1`, `month` → `calendar-days`, `year` → `calendar`.

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

#### Scenario: Period switcher buttons render a period-specific icon

- **GIVEN** the stats page renders the period switcher
- **WHEN** each period button renders
- **THEN** the week button SHALL contain an `icon-calendar-1` element, the month button SHALL contain an `icon-calendar-days` element, and the year button SHALL contain an `icon-calendar` element, each placed inline before the label

#### Scenario: Period icon is sized and aligned with the label

- **GIVEN** a period switcher button renders with its icon
- **WHEN** the button renders
- **THEN** the icon SHALL be vertically centered with the label text and sized to match the button text, without shifting the label baseline or breaking the segmented-button layout (flex:1, shared border-radius)

### Requirement: Year period charts are bucketed with a granularity toggle

For the year period the system SHALL NOT render one bar per trip. It SHALL aggregate the series into buckets controlled by a `yearGranularity` toggle with values `month` (default) and `week`. Each bucket bar SHALL represent the sum of distance and duration (chart 1) and the arithmetic mean of speed and consumption (chart 2) over the trips in that bucket. The granularity toggle SHALL render one button per value; each button SHALL display an icon inline before its label using the project's `lucide-static` font-icon system, matching the period switcher mapping: `month` → `calendar-days`, `week` → `calendar-1`.

#### Scenario: Year with month granularity (default)

- **GIVEN** the selected period is year and `yearGranularity` is unset or `month`
- **WHEN** the charts render
- **THEN** each chart SHALL show at most 12 bars, one per calendar month, each summarizing that month's trips

#### Scenario: Year with week granularity

- **GIVEN** the selected period is year and `yearGranularity` is `week`
- **WHEN** the charts render
- **THEN** each chart SHALL show one bar per ISO week (up to 53), each summarizing that week's trips

#### Scenario: Toggling year granularity

- **WHEN** the user toggles between Month and Week granularity while the period is year
- **THEN** the system SHALL request `/partials/stats?period=year&yearGranularity=<month|week>` and swap the charts region without a full page reload

#### Scenario: Granularity toggle buttons render a granularity-specific icon

- **GIVEN** the selected period is year and the granularity toggle renders
- **WHEN** each granularity button renders
- **THEN** the Month button SHALL contain an `icon-calendar-days` element and the Week button SHALL contain an `icon-calendar-1` element, each placed inline before the label
