## 1. Component

- [ ] 1.1 In `src/frontend/fragments/StatsChartsFragment.tsx`, add a helper mapping period/granularity value → icon name: `week` → `calendar-1`, `month` → `calendar-days`, `year` → `calendar`
- [ ] 1.2 In the period-switcher button render, render `<span class={`icon-${iconFor(p)}`} aria-hidden="true"></span>` before the existing label text
- [ ] 1.3 In the year-granularity button render, render the same icon span (using `iconFor(g)`) before the label text

## 2. Styling

- [ ] 2.1 In `public/app.css`, extend `.period-switcher button, .year-granularity button` with `display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem` while preserving `flex:1` and `border-radius: 0`
- [ ] 2.2 Add `.period-switcher button [class^="icon-"], .year-granularity button [class^="icon-"] { font-size: <button text size> }` so the icon matches the label size
- [ ] 2.3 Verify visually that the segmented-button shape (shared border-radius, flex:1) is preserved and the label baseline is not shifted

## 3. Tests

- [ ] 3.1 In `src/frontend/__tests__/stats-charts.test.tsx`, add a case asserting each period-switcher button renders the expected `icon-<name>` class (`calendar-1`, `calendar-days`, `calendar`)
- [ ] 3.2 Add a case asserting each year-granularity button (when period is year) renders the expected icon class (`calendar-days` for Month, `calendar-1` for Week)
- [ ] 3.3 Run `bun test` and ensure all stats-charts / navigation tests pass

## 4. Verification

- [ ] 4.1 Run `bun test` — full suite green (modulo pre-existing backend failures)
- [ ] 4.2 Run `prettier --check` on edited files
- [ ] 4.3 Manually verify the stats page renders the period switcher and year-granularity toggle with icons centered with their labels and the segmented shape intact
