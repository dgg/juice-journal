## Why

The app loads `lucide@1.31.0` JS (UMD) in `Layout.tsx` but never calls `lucide.createIcons()` — the script is dead weight. Meanwhile icons are ad-hoc UTF symbols (`☀`/`🌙`/`☾`/`◀`/`▶`) scattered across DOM components, with no consistent icon system. Lucide ships `lucide-static` with an icon font + CSS that needs zero JavaScript — a single `<link>` and `<span class="icon-sun">` — fitting this stack's "no client JS" constraint perfectly.

## What Changes

- **Layout asset swap**: Replace the unused `lucide.min.js` `<script>` in `Layout.tsx` with a `<link rel="stylesheet">` to `lucide-static@1.31.0/font/lucide.css` (CDN, SRI integrity hash). The icon font auto-loads via `@font-face`; no JS, no `createIcons()` call.
- **DOM icon replacement**: Replace UTF symbols with lucide icon font classes in DOM components:
  - `TripRow.tsx`: `☀`/`🌙` → `<span class="icon-sun">`/`<span class="icon-moon">` (daypart indicator)
  - `TripFormPage.tsx`: `☀`/`☾` → `icon-sun`/`icon-moon` (daypart segmented control)
  - `StatsChartsFragment.tsx`: `◀`/`▶` → `icon-chevron-left`/`icon-chevron-right` (period stepper buttons)
- **Chart axis labels stay UTF**: The chart x-axis labels (rendered on canvas via `ctx.fillText`) keep their UTF daypart emoji. Canvas cannot render CSS `::before` pseudo-elements or DOM `<svg>` injection — only `fillText`/`drawImage` reach it. This is explicitly out of scope.
- **app.css**: Add minimal sizing rules for icon spans (e.g., `.daypart-indicator .icon-sun` font-size) if Pico's inherited sizing is insufficient. No inline `<style>`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `frontend-views`: `Layout` loads the lucide-static icon font CSS instead of the unused lucide JS; view components use lucide icon font classes for DOM-rendered icons instead of UTF symbols.
- `trip-input-form`: The daypart segmented control renders lucide `icon-sun`/`icon-moon` instead of UTF `☀`/`☾`.
- `home-page-ssr`: The trip row daypart indicator renders lucide `icon-sun`/`icon-moon` instead of UTF `☀`/`🌙`.
- `trip-stats`: The period navigation stepper buttons render lucide `icon-chevron-left`/`icon-chevron-right` instead of UTF `◀`/`▶`.

## Impact

- **Code**: `src/frontend/Layout.tsx` (asset swap), `src/frontend/components/TripRow.tsx`, `src/frontend/pages/TripFormPage.tsx`, `src/frontend/fragments/StatsChartsFragment.tsx` (icon markup), `public/app.css` (optional sizing).
- **Dependencies**: `lucide-static` (icon font + CSS, same Lucide family already referenced). No npm install — loaded via CDN `<link>` like Pico and HTMX. The unused `lucide` JS dependency is removed.
- **DB / schema**: None.
- **Charts**: Unchanged — Chart.js, `stats.mjs`, and canvas-rendered axis labels are untouched.
- **Rollback**: Revert the asset `<link>` to the JS `<script>` and restore UTF symbols. No data migration; single commit.