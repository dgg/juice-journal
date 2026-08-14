## ADDED Requirements

### Requirement: Stats series query returns raw data, not display labels

The stats period series query SHALL return raw temporal data (`time` as a DateTime in the display timezone) and structured `daypart` (`"morning"` | `"afternoon"` | `null`) per row, and SHALL NOT format display labels or select presentation icons. The rendering layer (backend handler) SHALL construct the `series.labels` array from that raw data, applying bucket-specific date formats and appending the daypart icon only for the `trip` bucket where `daypart` is non-null. Aggregated buckets (`day`, `week`, `month`) SHALL carry `daypart: null` and the rendering layer SHALL emit no daypart icon for those rows.

#### Scenario: Trip bucket row carries structured daypart

- **GIVEN** a trip exists with `daypart = "morning"` and `end_time` on 14 Aug 2026
- **WHEN** the stats period series query runs with `bucket = "trip"`
- **THEN** the row SHALL return `time` as a DateTime for 14 Aug 2026 and `daypart = "morning"`, and SHALL NOT return a pre-formatted label string

#### Scenario: Aggregated bucket row carries null daypart

- **GIVEN** multiple trips exist within a calendar month
- **WHEN** the stats period series query runs with `bucket = "month"`
- **THEN** each row SHALL return `daypart = null` and `time` as the bucket start, and the rendering layer SHALL produce a label with no daypart icon

#### Scenario: Rendering layer builds trip label with daypart icon

- **GIVEN** the stats period series query returned a row with `time = 14 Aug 2026` and `daypart = "morning"` for the `trip` bucket
- **WHEN** the backend assembles the chart series labels
- **THEN** the label SHALL be `"14 Aug ☀"` (date formatted as `dd MMM` followed by the morning icon)

#### Scenario: Rendering layer builds aggregated label without icon

- **GIVEN** the stats period series query returned a row with `daypart = null` for the `day` bucket
- **WHEN** the backend assembles the chart series labels
- **THEN** the label SHALL be `"14 Aug"` (date formatted as `dd MMM`, no icon appended)