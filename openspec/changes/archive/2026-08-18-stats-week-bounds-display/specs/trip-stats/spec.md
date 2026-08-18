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
- **THEN** the stats and charts SHALL reflect trips whose `end_time` falls within July 2026 in the display timezone

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

## ADDED Requirements

### Requirement: Period label block renders week bounds only in week mode

The stats region SHALL render a period-label block adjacent to the vehicle indicator (the car icon plus vehicle description). The block's content SHALL be period-dependent: in the `week` period it SHALL display a human-readable week-bounds string of the form `dd MMM – dd MMM` (e.g. `18 Aug – 24 Aug`) computed from the ISO week bounds in the display timezone; in the `month` and `year` periods it SHALL NOT render the period label text at all, rendering only the vehicle indicator (car icon and vehicle description) when a vehicle exists. The week-bounds string SHALL use the display timezone, SHALL start at the ISO week's Monday and end at its Sunday (inclusive), and SHALL format both endpoints as `dd MMM` (zero-padded day, abbreviated month name in the display locale). The `data.label` field SHALL remain available on the stats view for non-fragment consumers but SHALL NOT be rendered inside this block in any period.

#### Scenario: Week mode renders week bounds next to the vehicle indicator

- **GIVEN** the selected period is `week` and the anchor ISO week is 18–24 August 2026 in the display timezone
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL display `18 Aug – 24 Aug` adjacent to the car icon and vehicle description

#### Scenario: Month mode renders no period label text

- **GIVEN** the selected period is `month` and the anchor month is August 2026
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL NOT contain the period label string (e.g. `August 2026`) and SHALL render only the car icon and vehicle description when a vehicle exists

#### Scenario: Year mode renders no period label text

- **GIVEN** the selected period is `year` and the anchor year is 2026
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL NOT contain the period label string (e.g. `2026`) and SHALL render only the car icon and vehicle description when a vehicle exists

#### Scenario: Week bounds follow the display timezone

- **GIVEN** the selected period is `week` and the anchor ISO week starts on Monday 18 August 2026 in the configured display timezone
- **WHEN** the week-bounds string is rendered
- **THEN** the start endpoint SHALL be `18 Aug` and the end endpoint SHALL be `24 Aug`, both derived from the same ISO-week bounds used to filter trips

#### Scenario: Week bounds update on period navigation

- **GIVEN** the user is viewing the week period for the week of 18–24 August 2026
- **WHEN** the user navigates to the previous ISO week
- **THEN** the period-label block SHALL display `11 Aug – 17 Aug`

#### Scenario: No vehicle leaves only the week bounds in week mode

- **GIVEN** the selected period is `week` and no vehicle is associated with the most recent trip
- **WHEN** the stats region renders
- **THEN** the period-label block SHALL display only the week-bounds string and SHALL NOT render the car icon or a vehicle description
