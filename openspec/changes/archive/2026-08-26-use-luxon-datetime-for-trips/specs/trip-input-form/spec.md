## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Date and time assembled into ISO datetimes server-side

**Reason**: The old requirement mandated pre-conversion to UTC (`Z` suffix) before passing to `tripInputSchema.parse()`. The new approach preserves the local offset in the ISO string, letting the schema transform handle UTC normalization uniformly for both form and API paths.
**Migration**: `parseFormTripInput` changes `.toUTC().toISO()` to `.toISO()` (preserving offset). The transform in `tripInputSchema` handles the rest.
