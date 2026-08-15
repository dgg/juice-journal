## 1. Extend the inline StatCard component

- [x] 1.1 Add `displayValue?: string | null` and `deltaUnit?: string` optional props to the `StatCard` function signature in `src/frontend/fragments/StatsChartsFragment.tsx`
- [x] 1.2 When `displayValue` is provided and non-null, render it verbatim as the `<data>` element's text content instead of the numeric `formatted` output; keep the numeric `value` on the `<data value>` attribute for semantics
- [x] 1.3 When `displayValue` is provided and non-null, render the unit `<small>` as empty (no suffix); when `displayValue` is null or absent, keep existing behavior (numeric `formatted` + `unit`)
- [x] 1.4 Pass `deltaUnit ?? unit` to the `Delta` component instead of `unit`, so the delta unit can differ from the value unit

## 2. Update the avg-duration call site

- [x] 2.1 Change the avg-duration `StatCard` invocation in `StatsChartsFragment` to pass `displayValue={data.stats.avgDurationHm}`, `unit=""`, and `deltaUnit="min"` (keep `value={data.stats.avgDuration.value}` and `prev={data.stats.avgDuration.prev}` for delta computation)
- [x] 2.2 Remove the leftover `console.log(data.stats)` debug statement on line 186 of `StatsChartsFragment.tsx`

## 3. Update tests

- [x] 3.1 In `src/frontend/__tests__/stats-charts.test.tsx`, add a test asserting that when `avgDurationHm` is `"30m"` and `avgDuration.value` is `30`, the rendered HTML contains `>30m<` as the value text and does NOT contain `>30<` followed by `30m` as a unit suffix
- [x] 3.2 Add a test for the hours-and-minutes case (e.g., `avgDuration.value: 90`, `avgDurationHm: "1h 30m"`) asserting the value renders as `1h 30m` with no unit suffix and the raw `90` does not appear as the value text
- [x] 3.3 Add a test for the null-duration case (`avgDuration.value: null`, `avgDurationHm: null`) asserting the card renders `--` with no unit suffix
- [x] 3.4 Add a test asserting the avg-duration delta still renders with the `min` unit suffix (e.g., contains `min` within the delta element) when both current and prev durations are non-null

## 4. Verify

- [x] 4.1 Run `bun test` and confirm all tests pass (125 pass, 5 pre-existing backend failures unrelated to this change)
- [x] 4.2 Run lint/typecheck if configured and confirm no errors (no lint/typecheck scripts configured)
