## Why

Weather is already fetched and persisted on every trip (`weather_start` / `weather_end` JSONB), but it is never shown. A commute journal is most useful when ambient conditions sit next to the trip metrics, so the trip row should surface start-of-trip weather inline with the existing detail pills.

## What Changes

- The trip row's expandable body renders a single **Weather detail pill** alongside the distance / duration / speed / odometer / route pills, using only the **start** weather snapshot.
- The pill packs four measurements into one `<dd>`: a WMO `weather_code` icon + temperature (`°`), precipitation (`umbrella` + `mm`), humidity (`droplets` + `%`), and wind (`wind` + a rotated `mouse-pointer-2` arrow + `m/s`).
- The 27-entry per-WMO-code icon map from issue #20 is **collapsed to 8 categories** (clear / partly / overcast / fog / drizzle / rain / snow / thunder), each mapped to one `lucide-static` font icon. Intensity is already conveyed by the precipitation `mm` value, so per-code granularity adds no signal.
- Wind direction is rendered with `icon-mouse-pointer-2` (originally pointing up-left = NW) rotated via **8 named CSS classes** in `public/app.css` — `wind-from-n`, `wind-from-ne`, `wind-from-e`, `wind-from-se`, `wind-from-s`, `wind-from-sw`, `wind-from-w`, `wind-from-nw` — each applying the fixed rotation that makes the arrow point **from** the wind's origin cardinal/intercardinal direction (meteorological convention).
- The query that feeds the home page (`findTripsWithLocations`) and the frontend `Trip` interfaces are extended to carry `weatherStart` through to `TripRow`. No new API endpoints, no schema changes, no new dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-views`: the trip row's detail `<dl>` gains a Weather term-description pair rendering start-of-trip conditions, and `public/app.css` gains 8 wind-direction rotation classes.
- `trip-weather`: no storage/fetch behavior changes; the existing `weather_start` payload is now consumed by the view layer (documented as a new "consumed by the trip row" scenario).

## Impact

- `src/db/queries/trips.ts` — `findTripsWithLocations` `SELECT`s `weather_start`; `TripWithLocationRow` gains `weatherStart: object | null`.
- `src/frontend/components/TripRow.tsx` — `Trip` interface gains `weatherStart`; renders the Weather detail pill when `weatherStart` is non-null.
- `src/frontend/pages/HomePage.tsx` and `src/frontend/fragments/TripListFragment.tsx` — `Trip` interface gains `weatherStart` (passed through unchanged).
- `public/app.css` — 8 `.wind-from-*` rotation classes; no inline styles introduced.
- A small pure module maps WMO code → category → `lucide-static` icon class, and direction degrees → wind-from class, so the JSX stays declarative.

## Rollback

- Revert the `TripRow.tsx` weather pill block and the `Trip` interface field additions; the unused `weatherStart` plumbing becomes dead but harmless.
- Revert `findTripsWithLocations` to drop `weather_start` from the `SELECT` and `TripWithLocationRow`.
- Remove the `.wind-from-*` rules and the new WMO/direction mapping module.
- No database migration is required — the `weather_start` column remains and continues to be populated on creation; only its display is removed.