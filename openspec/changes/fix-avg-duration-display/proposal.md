## Why

The average-duration stat card renders a broken display: the raw minutes value (e.g., `90`) is shown alongside the hours-and-minutes string (e.g., `1h 30m`) placed in the unit slot, producing output like "90 1h 30m". The `avgDurationHm` field — a human-readable hours+minutes representation — is mistakenly passed as the `unit` prop to `StatCard`, so the numeric value and its formatted form visually collide instead of one replacing the other.

## What Changes

- The average-duration stat card SHALL display the hours-and-minutes string (e.g., `1h 30m`, `45m`, `2h`) as the primary value when a duration value exists, instead of the raw minutes number.
- The unit slot for the average-duration card SHALL be empty when the hours-and-minutes value is shown, so no redundant suffix appends to the formatted duration.
- The fallback behavior (null duration) SHALL remain: render `--` with no unit, unchanged from today.
- The `StatCard` component's numeric-formatting logic SHALL be bypassed for the duration card so the pre-formatted string is rendered verbatim.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `trip-stats`: The "Stats values are aggregated for the selected period" requirement is modified to specify that the average-duration stat card displays the hours-and-minutes formatted string as the value with an empty unit, rather than the raw minutes number with the HM string as a unit suffix.

## Impact

- **Affected code:** `src/frontend/fragments/StatsChartsFragment.tsx` (StatCard usage for avg duration, and possibly the `StatCard` component to accept a pre-formatted value), `src/backend/stats.tsx` (no logic change — `avgDurationHm` field already produced correctly).
- **Affected tests:** `src/frontend/__tests__/stats-charts.test.tsx` and `src/frontend/__tests__/navigation.test.tsx` may need assertions updated to reflect the new rendered output.
- **No API changes:** The `/partials/trip-stats` endpoint shape is unchanged; the `StatsView` interface keeps `avgDurationHm` and `avgDuration`.
- **No dependency changes.**
- **Rollback:** Revert the StatCard call site to pass `unit="min"` and `value={data.stats.avgDuration.value}`. No schema or data migration involved.
