## 1. Preparation

- [ ] 1.1 Grep repo for `monthlyAggregates` callers to confirm only `homeHandler` and `getPartialStats` use it (and the back-compat alias can stay for safety)
- [ ] 1.2 Grep repo for `StatsGrid` and `StatsFragment` usages to confirm no caller outside `HomePage`, `StatsFragment`, and `getPartialStats`
- [ ] 1.3 Grep repo for `formatHm` to confirm the only definition is the file-local one in `src/backend/stats.tsx:115`

## 2. Shared utilities

- [ ] 2.1 Create `src/utils/format.ts` exporting `formatHm(minutes: number | null): string | null` with the same behavior as the file-local helper (`null` → `null`, `0m` → `0m`, `120` → `2h`, `90` → `1h 30m`, `45` → `45m`)
- [ ] 2.2 Replace the file-local `formatHm` in `src/backend/stats.tsx` with an import from `src/utils/format.ts`; remove the local definition
- [ ] 2.3 Run `bun test` to confirm stats page tests still pass after the `formatHm` move

## 3. Shared `StatsSummaryGrid` fragment

- [ ] 3.1 Define the `StatWithDelta` and `StatsSummary` interfaces in a shared location (e.g. `src/frontend/fragments/StatsSummaryGrid.tsx` or a small `src/frontend/types.ts`) — same shape as `StatsView.stats` minus the series/period-switcher fields
- [ ] 3.2 Create `src/frontend/fragments/StatsSummaryGrid.tsx` exporting `StatsSummaryGrid: FC<{ data: StatsSummary }>` that renders the two hero cards (total distance, total time driven) in `.stats-hero-row` and the four grid cards (avg speed, avg duration, avg consumption, trip count) in `.stats-grid__row`, computing each delta inline (current minus previous, `null` when either side is null) and passing `period` through to `Delta` for the suffix
- [ ] 3.3 Verify the avg-duration and total-time-driven cards use `displayValue` for the `*Hm` string with an empty `unit`, and `deltaUnit: "min"` for the delta
- [ ] 3.4 Verify the empty state: when a stat value is `null`, the card renders `--` (and the `*Hm` cards render `--` with no unit), with `data-empty` on hero cards

## 4. Stats page migration

- [ ] 4.1 Refactor `StatsChartsFragment` to build a `StatsSummary` from its existing `StatsView.stats` and render `<StatsSummaryGrid data={summary} />` in place of the inlined hero + grid JSX
- [ ] 4.2 Keep the year-granularity toggle, chart region, period switcher, and period navigation in `StatsChartsFragment` — only the hero + grid block moves out
- [ ] 4.3 Run `bun test src/frontend/__tests__/stats-charts.test.tsx` and fix any snapshot/assertion drift caused by the delegation

## 5. Home page migration

- [ ] 5.1 Update `HomeData` interface in `src/backend/home.tsx` to the expanded `StatsSummary` shape (six `StatWithDelta` fields + `totalTimeHm` + `avgDurationHm` + `period: "month"`)
- [ ] 5.2 Switch `homeHandler` from `statsQueries.monthlyAggregates` to `statsQueries.periodAggregates`; unpack `totalDuration`, `avgSpeed`, and `tripCount` from the result
- [ ] 5.3 Compute `totalTimeHm` and `avgDurationHm` via `formatHm` and assemble the `StatsSummary` view-model with `period: "month"`
- [ ] 5.4 Update `HomePage` (`src/frontend/pages/HomePage.tsx`) to render `<StatsSummaryGrid data={data.stats} />` instead of `<StatsGrid stats={data.stats} />`; update the `HomePageData` interface on the frontend to match
- [ ] 5.5 Wrap the stats panel in a stable container id (e.g. `#stats-region`) so the OOB swap from `POST /trips` targets the right node

## 6. `/partials/stats` fragment migration

- [ ] 6.1 Update `getPartialStats` (`src/backend/html-handlers.tsx:104-144`) to call `statsQueries.periodAggregates` and build the same `StatsSummary` view-model as `homeHandler` (with `period: "month"`)
- [ ] 6.2 Have `getPartialStats` render `<StatsSummaryGrid data={summary} />` directly (no `Layout`); delete `src/frontend/fragments/StatsFragment.tsx` if no other caller remains
- [ ] 6.3 Delete the `StatsGrid` export from `src/frontend/components/StatCard.tsx` (keep `StatCard` and the `Stat` interface); confirm no remaining importer
- [ ] 6.4 Verify the `POST /trips` HTML handler still emits the stats fragment with `hx-swap-oob="true"` targeting the home page stats container

## 7. Tests

- [ ] 7.1 Update `src/backend/home.test.ts` to assert six stat cards render with the expected labels and MoM deltas (cover the hero + grid layout, the `*Hm` formatting for total time and avg duration, and the `--` empty state for an empty month)
- [ ] 7.2 Add a test asserting the home page response does NOT contain the Chart.js script tag, the `stats.mjs` script, a period switcher, or a period navigation control
- [ ] 7.3 Add a test for `GET /partials/stats` asserting it returns the hero + grid summary markup (six cards, `vs last month` deltas, no charts)
- [ ] 7.4 Add a test for `POST /trips` asserting the response includes the stats fragment marked `hx-swap-oob="true"` and that the fragment contains six cards
- [ ] 7.5 Run `bun test` end-to-end; fix any remaining snapshot or contract drift

## 8. Verification

- [ ] 8.1 Run `bun test` — all tests pass
- [ ] 8.2 Run `docker build .` — image builds cleanly
- [ ] 8.3 Manual smoke test on desktop and phone widths: home page shows two hero cards + four-card grid, deltas read `vs last month`, no charts render
- [ ] 8.4 Manual smoke test: log a new trip via `POST /trips`; confirm the stats panel refreshes out-of-band without a full page reload and shows the updated aggregates
- [ ] 8.5 Manual smoke test: visit `/stats`; confirm the stats page still renders its hero + grid, period switcher, charts, and granularity toggle unchanged
