## Context

See `proposal.md` for motivation. The current chart code lives in two files — `public/scripts/charts/distance-duration.mjs` (bar chart with two datasets, dual y-axis) and `public/scripts/charts/speed-consumption.mjs` (structurally identical bar chart). Both extend the global `Chart` class (loaded from the CDN in `StatsPage`). The shared mount/destroy lifecycle lives in `public/scripts/stats.mjs`, which parses the `#stats-data` JSON blob (the `series` payload from `stats.tsx`) and instantiates one chart per canvas id. Colors are read from Pico CSS custom properties via `public/scripts/ui/colors.mjs` (`getColorHex` / `getColorRgba`).

The `series` payload shape (`labels`, `distance`, `duration`, `speed`, `consumption`) is **not** changing. All new behavior is local to the two chart files.

## Goals / Non-Goals

**Goals:**

- Convert the speed + consumption chart from bars to dual lines without changing the `series` payload or the mount lifecycle.
- Polish the distance + duration bar chart (rounded corners, gradient fills, soft grid) without changing its chart type.
- Keep all changes scoped to `public/scripts/charts/*.mjs`. No backend, no schema, no markup, no new deps.

**Non-Goals:**

- Period-adaptive chart types (bars for week, lines for month/year). One shape per chart, all periods. (See proposal — explicitly deferred.)
- Mobile rendering. Charts stay hidden below the tablet breakpoint via existing CSS.
- Reference/annotation overlays (`chartjs-plugin-annotation`) or data labels. New deps out of scope.
- Daypart visualization. Daypart stays a label-suffix on trip buckets.

## Decisions

### Decision 1: Per-dataset `type: "line"` inside a `bar` chart, not a top-level `type: "line"`

Chart.js 4 allows each dataset to declare its own `type`, so a chart declared as `type: "bar"` can host line datasets. We instead declare chart 2 as `type: "line"` outright (both datasets are lines), and keep chart 1 as `type: "bar"`.

**Why:** Both series on chart 2 are lines — declaring the chart as `type: "line"` and letting datasets inherit is simpler than mixing types. Mixed-type charts are only worth it when at least one dataset stays a bar, which is not the case here.

**Alternatives considered:**

- Mixed `bar` chart with `type: "line"` per dataset. Useful when one series is a bar and another a line (e.g. distance bars + duration line). Rejected here — chart 2 has no bars at all.
- Separate charts per series (one chart per metric). Cleaner per-series, but doubles the canvas count and breaks the dual-axis narrative.

### Decision 2: Gradient via scriptable `backgroundColor` returning a `CanvasGradient`

Each bar dataset on chart 1 declares `backgroundColor` as a function `(ctx) => { ... }` that constructs a `CanvasGradient` from `ctx.chart.ctx` (the 2D context) on demand. Top stop = the dataset's hue family at a lighter shade (e.g. `azure-350`); bottom stop = the same hue at a richer shade (e.g. `azure-600`). Vertical orientation (`0,0` to `0, chartArea.bottom`).

**Why:** Single flat fills look dated; gradients add depth without a new dependency. Scriptable (not static) is required because the gradient depends on `chartArea`, which isn't known until layout.

**Alternatives considered:**

- Static `backgroundColor` with a pre-built gradient via `Chart.js`'s `getChartArea` callbacks. More fragile across resizes; scriptable is the documented Chart.js 4 pattern.
- A `chartjs-plugin` for fancier fills. New dep — rejected.

### Decision 3: Soft grid on left y-axis only, right axis keeps `grid.drawOnChartArea: false`

The existing code already suppresses the right-axis grid. We add a soft left-axis grid (`grid.color: "rgba(127,127,127,0.06)"`, `grid.lineWidth: 1`). This gives the eye horizontal reference lines without competing grid overlays.

## Risks / Trade-offs

- **[Gradient on small chart areas]** On periods with 1–2 trips the chart canvas is sparse and the gradient fill may look like a flat block because `chartArea` is tall but only one or two bars occupy it. → Acceptable: the gradient still renders correctly; the visual loss is minor in the small-N regime where the chart is already sparse.
- **[Scriptable `backgroundColor` re-runs on every render]** Chart.js calls scriptable functions on each animation frame; constructing a `CanvasGradient` each frame is cheap but not free. → Mitigated by caching the gradient on the dataset object keyed by `chartArea` dimensions, or by accepting the cost (modern browsers handle it at 60fps for two small charts). Decision: accept the cost; revisit if profiling shows issues.

## Migration Plan

1. Rewrite `speed-consumption.mjs` to declare `type: "line"` with two line datasets (speed and consumption) and the new styling.
2. Rewrite `distance-duration.mjs` to add `borderRadius`, scriptable gradient `backgroundColor`, and the soft left-axis grid.
3. Manually verify each period (week with few trips, month with daily buckets, year with month and week granularity) on a desktop viewport.

## Rollback

Pure-frontend change. `git revert` the commit(s) touching `public/scripts/charts/*.mjs`. No data migration, no API contract change, no cache to clear.

## Open Questions

- Should the gradient direction be top-lighter-bottom-richer (current decision) or top-richer-bottom-lighter? Top-lighter-bottom-richer is the conventional "weight at the base" pattern and matches how Chart.js's own docs illustrate gradients. Decided; flagged here only because the alternative is reasonable.
