## 1. DB query layer — return raw data

- [x] 1.1 Update `PeriodSeriesRow` interface in `src/db/queries/stats.ts`: replace `label: string` with `time: DateTime` and `daypart: string | null`
- [x] 1.2 Update the `trip` bucket branch of `periodSeries`: return `time` (DateTime from `end_time` in display tz) and `daypart` (the raw `row.daypart` value); remove the label formatting and emoji assignment
- [x] 1.3 Update the aggregated bucket branches (`day`, `week`, `month`): return `time` (bucket start DateTime) and `daypart: null`; remove the label formatting logic

## 2. Backend rendering layer — build labels from raw data

- [x] 2.1 In `computeStatsView` (`src/backend/stats.tsx`), add a label-building step that maps each row to a display label using the bucket type already computed (`bucket` variable at line 172)
- [x] 2.2 Apply bucket-specific date formats: `trip` and `day` → `dd MMM`, `week` → `'W'WW`, `month` → `MMM`
- [x] 2.3 Append the daypart icon (`☀` for morning, `🌙` for afternoon) only when `daypart` is non-null (i.e., `trip` bucket); emit no icon for aggregated buckets
- [x] 2.4 Wire the built labels into `series.labels` (replacing `rows.map(r => r.label)`)

## 3. Tests

- [x] 3.1 Update `src/db/queries/stats.test.ts`: replace `expect(typeof series[0]!.label).toBe("string")` assertions (lines 155, 171) with assertions on `time` (DateTime) and `daypart`
- [x] 3.2 Add a test case verifying the `trip` bucket returns non-null `daypart` matching the seeded trip's daypart
- [x] 3.3 Add a test case verifying the `month`/`week` aggregated buckets return `daypart: null`
- [x] 3.4 Run `bun test` and confirm all tests pass

## 4. Verification

- [x] 4.1 Run `bun test` — all tests pass
- [x] 4.2 Manually verify the week-period stats chart still shows `dd MMM ☀/🌙` labels on the x-axis (no visual regression)
- [x] 4.3 Manually verify the month/year-period stats chart shows date-only labels (no icon) on the x-axis
- [x] 4.4 Verify `docker build .` succeeds