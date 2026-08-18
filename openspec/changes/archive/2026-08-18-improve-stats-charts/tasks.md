## 1. SMA helper (ROLLED BACK — SMA removed per user decision)

- [x] ~~1.1 Create `public/scripts/charts/rolling-average.mjs` exporting `trailingSma`~~ — ROLLED BACK, file deleted
- [x] ~~1.2 Add a unit test for `trailingSma`~~ — ROLLED BACK, file deleted
- [x] ~~1.3 Confirm `undefined` handling in `trailingSma`~~ — ROLLED BACK

## 2. Speed + consumption chart rewrite

- [x] 2.1 In `public/scripts/charts/speed-consumption.mjs`, change the chart `type` from `"bar"` to `"line"`
- [x] 2.2 Convert `speedDataset` and `consumptionDataset` to line datasets: remove `backgroundColor`/`borderColor` bar semantics; set `borderColor` to the hue family color (`cyan-450` for speed, `purple-450` for consumption), `backgroundColor: "transparent"` (no area fill), `borderWidth: 2`, `tension: 0.35`, `pointRadius: 3`, `pointHoverRadius: 5`, `yAxisID` unchanged
- [x] ~~2.3 Add a third dataset `consumptionSmaDataset`~~ — ROLLED BACK per user decision: SMA does not earn its place
- [x] 2.4 Add the soft left-axis grid (`scales.y.grid.color: "rgba(127,127,127,0.06)"`, `lineWidth: 1`) and confirm `scales.y1.grid.drawOnChartArea` stays `false`
- [x] 2.5 Condense the legend: `plugins.legend.position: "top"`, `labels.boxWidth: 12`, `labels.boxHeight: 12`, `labels.font.size: 12` so two legend items fit one row

## 3. Distance + duration chart polish

- [x] 3.1 In `public/scripts/charts/distance-duration.mjs`, add `borderRadius: 6` and `borderSkipped: false` to both `distanceDataset` and `durationDataset`
- [x] 3.2 Replace the static `backgroundColor` on each dataset with a scriptable function returning a vertical `CanvasGradient` per Decision 4: top stop at the hue family's lighter shade (`azure-350` for distance, `amber-100` for duration), bottom stop at the richer shade (`azure-600`, `amber-300`). Use `ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)` and guard `chartArea` being undefined on first call
- [x] 3.3 Add the soft left-axis grid (same values as 2.4) and confirm `scales.y1.grid.drawOnChartArea` stays `false`
- [x] 3.4 Reduce hover animation duration to ~200ms: `options.animations.colors.duration: 200`, `options.animations.y.duration: 200` (or the equivalent `transitions` config in Chart.js 4.5)

## 4. Verification

- [x] 4.1 Run `bun test` — confirmed no existing test regressed (the `stats-charts.test.tsx` snapshot is unaffected since markup is unchanged). 144 pass, 0 fail.
- [ ] 4.2 Start the dev server and visit `/stats` on a desktop-width viewport. Verify each period in turn: week (few trips), month (daily buckets), year with `yearGranularity=month` (≤12 points), year with `yearGranularity=week` (≤53 points) — **manual**
- [ ] 4.3 For each period, confirm: chart 1 shows gradient-filled rounded bars with a soft grid; chart 2 shows two lines (cyan speed, solid purple consumption); no SMA overlay present — **manual**
- [ ] 4.4 Confirm the legend renders two items on chart 2 (Speed, Avg consumption) and two items on chart 1, each as a single top row — **manual**
- [ ] 4.5 Confirm the mobile hide rule (`@media (max-width: 768px) #stats-charts { display: none }`) still suppresses both charts — no canvas or chart-related markup should render on phone width — **manual**

## 5. Keep-or-remove decision (ROLLED BACK)

- [x] 5.1 User decided SMA does not make sense for this chart. SMA dataset, `rolling-average.mjs`, and its test have been removed. Spec and proposal updated accordingly.
