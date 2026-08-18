## 1. Backend: expose week-bounds label on `StatsView`

- [ ] 1.1 Add `weekBoundsLabel: string | null` to the `StatsView` interface in `src/backend/stats.tsx` (and mirror it on the local `StatsView` interface in `src/frontend/pages/StatsPage.tsx` if that is the shared declaration site).
- [ ] 1.2 In `computeStatsView` (`src/backend/stats.tsx`), compute `weekBoundsLabel` only when `period === "week"`: `const monday = now.setZone(displayTz).startOf("week")`, `const sunday = monday.plus({ days: 6 })`, format ``${monday.toFormat("dd MMM")} – ${sunday.toFormat("dd MMM")}``. Set `null` for month/year.
- [ ] 1.3 Return `weekBoundsLabel` in the `computeStatsView` result object (between `label` and `vehicle` to mirror the interface order).

## 2. Frontend: conditional `stats-period-label` rendering

- [ ] 2.1 In `src/frontend/fragments/StatsChartsFragment.tsx`, replace the unconditional `<small>{data.label}</small>` in the `stats-period-label` block with a conditional: render `<small>{data.weekBoundsLabel}</small>` only when `data.weekBoundsLabel` is non-null (week mode).
- [ ] 2.2 Leave the vehicle-indicator `<small>` (car icon + `data.vehicle.description`) unchanged, still gated on `data.vehicle`. Ensure no `data.label` reference remains in the fragment.
- [ ] 2.3 Verify the block collapses cleanly (no stray text/whitespace) in month/year mode when no vehicle exists.

## 3. Tests

- [ ] 3.1 In `src/frontend/__tests__/stats-charts.test.tsx`, add/adjust a week-mode assertion: the rendered fragment contains the `dd MMM – dd MMM` week-bounds string and does NOT contain the `W<nn> yyyy` period label.
- [ ] 3.2 Add/adjust a month-mode assertion: the fragment does NOT render the period label string (e.g. `August 2026`) in the `stats-period-label` block; the vehicle badge still renders when a vehicle is present.
- [ ] 3.3 Add/adjust a year-mode assertion: the fragment does NOT render the period label string (e.g. `2026`) in the `stats-period-label` block.
- [ ] 3.4 Add a week-navigation assertion: after navigating to the previous ISO week, the block displays the previous week's bounds (`dd MMM – dd MMM`).
- [ ] 3.5 Add a no-vehicle week-mode assertion: the block renders only the week-bounds string (no car icon, no vehicle description).

## 4. Verification

- [ ] 4.1 Run `bun test` and ensure all stats-chart tests pass.
- [ ] 4.2 Run lint/typecheck (per repo conventions) and resolve any errors.
- [ ] 4.3 Spot-check `/stats?period=week`, `/stats?period=month`, `/stats?period=year` in a browser; confirm week shows bounds next to the car and month/year show only the car.
