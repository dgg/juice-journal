## Why

The stats page charts currently render every series as flat bars with square corners, 1px borders, no grid, and no trend layer. The "Avg Speed & Consumption" chart is the weakest case: averages are *rates* whose story is the slope (is efficiency improving?), and bars answer that question poorly — the eye must subtract bar heights across N categories. The whole app exists to surface EV efficiency trends, so the chart that should answer that question should render as lines and overlay a smoothed trend.

## What Changes

- **Speed & consumption chart → dual-line**: convert both series from bars to lines, each on its own y-axis, distinct hue (amber speed, jade consumption). No new dependencies — Chart.js 4.5.1 supports per-dataset `type: "line"`.
- **Distance & duration chart → polished bars**: keep as bars but add rounded corners (`borderRadius`), a soft horizontal grid, and vertical gradient fills via scriptable `backgroundColor` returning a `CanvasGradient`. No chart-type change. Rosé Pine-inspired palette: slate for distance, pink for duration.
- **Polish applied to both charts**: condensed legend row, faster hover animation, x-axis grid hidden (already the case, made explicit).
- **Delta indicator simplified**: remove the unit suffix and the period-aware suffix (`vs last week` / `vs last month` / `vs last year`) from delta indicators on both the stats page and home page. The selected period is already visible from the period switcher and navigation control; the unit is already visible on the stat card's value. The trend icon, sign, value, and color class are sufficient.

No chart-type change for distance/duration. No new dependencies. No schema, API, or markup changes — the `series` payload from `stats.tsx` is unchanged. Charts remain desktop-only; the mobile hide rule in `public/app.css` is untouched.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-stats`: the "Two dual-axis charts render the current period only" requirement changes — chart 2 (speed & consumption) becomes a dual-line chart; chart 1 (distance & duration) keeps bars but gains rounded corners, soft grid, and gradient fills. The "Per-trip charts for week and month" and year-bucketing scenarios are amended to reflect line-vs-bar semantics. The "Previous-period deltas are shown for each stat" requirement changes — delta indicators no longer render a unit suffix or period-aware suffix.
- `home-page-ssr`: the "Month-over-month statistics comparison" requirement changes — delta indicators no longer render a unit suffix or `vs last month` suffix.

## Impact

- **Code**: `public/scripts/charts/distance-duration.mjs`, `public/scripts/charts/speed-consumption.mjs`, `src/frontend/components/Delta.tsx`, `src/frontend/components/StatCard.tsx`, possibly `public/app.css` for canvas height.
- **Dependencies**: none new. Chart.js 4.5.1 already supports per-dataset `type`, `borderRadius`, scriptable `backgroundColor` (gradient), and `borderDash`.
- **APIs**: none. The `series` payload from `stats.tsx` is unchanged.
- **Database**: none.
- **Mobile**: none — charts remain hidden below the tablet breakpoint by existing CSS.

## Rollback

Pure-frontend change. Revert the modified chart modules to their pre-change state (`git revert`). No data migration, no API contract change, no cache to clear.
