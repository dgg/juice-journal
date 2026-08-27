## 1. Data plumbing

- [ ] 1.1 In `src/db/queries/trips.ts`, add `weather_start` to the `SELECT` column list in both branches of `findTripsWithLocations` (vehicle-filtered and unfiltered), and add `weatherStart: (raw.weather_start as object | null) ?? null` to `mapTripWithLocationRow` and to the `TripWithLocationRow` interface
- [ ] 1.2 Extend the `Trip` interface in `src/frontend/components/TripRow.tsx`, `src/frontend/pages/HomePage.tsx`, and `src/frontend/fragments/TripListFragment.tsx` with `weatherStart: object | null`
- [ ] 1.3 Confirm the home page handler passes `weatherStart` through from the query result to the `TripRow` component without reshaping

## 2. WMO code → icon mapping module

- [ ] 2.1 Create a small pure module (e.g. `src/frontend/weather/display.ts`) exporting a function that maps a WMO `weather_code` to one of 8 `lucide-static` icon classes: `clear`→`icon-sun`, `partly`→`icon-cloud-sun`, `overcast`→`icon-cloudy`, `fog`→`icon-cloud-fog`, `drizzle`→`icon-cloud-drizzle`, `rain`→`icon-cloud-rain`, `snow`→`icon-cloud-snow`, `thunder`→`icon-cloud-lightning`; unknown/null code → `icon-thermometer-sun` fallback
- [ ] 2.2 Add unit tests (`bun test`) covering: one representative code per category, the null/unknown fallback, and a boundary code per category

## 3. Wind direction → rotation class module

- [ ] 3.1 In the same display module, export a function that bins `wind.direction` (degrees, meteorological from-origin) into one of 8 `wind-from-*` classes using 45° sectors centered on each cardinal/intercardinal: n `[337.5,22.5)`, ne `[22.5,67.5)`, e `[67.5,112.5)`, se `[112.5,157.5)`, s `[157.5,202.5)`, sw `[202.5,247.5)`, w `[247.5,292.5)`, nw `[292.5,337.5)`; null direction → returns null (arrow omitted)
- [ ] 3.2 Add unit tests covering each bin's midpoint plus the 360° wrap (e.g. 350 → `wind-from-n`) and null → null

## 4. Weather detail pill in TripRow

- [ ] 4.1 In `src/frontend/components/TripRow.tsx`, render the Weather `<dt class="sr-only">Weather</dt>` / `<dd class="trip-detail-pill">` block **only when `trip.weatherStart` is non-null**, appended after the existing pills inside the `trip-detail-pills` `<dl>`
- [ ] 4.2 Inside the pill, render in order: WMO icon span, temperature `<data>` with `<span class="pill__unit">°</span>`; `icon-umbrella`, precipitation `<data>` with `<small class="pill__unit">mm</small>`; `icon-droplets`, humidity `<data>` with `<small class="pill__unit">%</small>`; `icon-wind`, conditional rotated `icon-mouse-pointer-2` span (with its `wind-from-*` class, omitted when direction is null), wind speed `<data>` with `<small class="pill__unit">m/s</small>`
- [ ] 4.3 No inline `style` attribute anywhere in the pill; all rotation via the CSS class

## 5. CSS — wind-from rotation classes

- [ ] 5.1 In `public/app.css`, add 8 classes — `wind-from-n`, `wind-from-ne`, `wind-from-e`, `wind-from-se`, `wind-from-s`, `wind-from-sw`, `wind-from-w`, `wind-from-nw` — each applying a fixed clockwise `transform: rotate(<deg>)` (with the standard vendor-prefix stack: `-webkit-`, `-moz-`, `-ms-`, `-o-`). The class name describes the wind's **origin** (where it blows from); the rotation makes the native NW-pointing `icon-mouse-pointer-2` glyph (315°) point in the wind's **travel** direction (origin + 180°). Rotation table: `wind-from-se` = 0° (native, travel = NW), `wind-from-s` = 45°, `wind-from-sw` = 90°, `wind-from-w` = 135°, `wind-from-nw` = 180°, `wind-from-n` = 225°, `wind-from-ne` = 270°, `wind-from-e` = 315°
- [ ] 5.2 Confirm the rotated arrow is visually centered/aligned with the adjacent `icon-wind` streaks inside the pill; add a minimal alignment rule only if Pico/inline-flex leaves it off

## 6. Tests

- [ ] 6.1 Add a `TripRow` render test asserting the Weather `<dt>`/`<dd>` pair appears with all four measurement `<data>` elements when `weatherStart` is a valid object
- [ ] 6.2 Add a `TripRow` render test asserting no Weather `<dt>`/`<dd>` pair appears when `weatherStart` is null
- [ ] 6.3 Add a `TripRow` render test asserting the `icon-mouse-pointer-2` span carries the correct `wind-from-*` class for a known direction (e.g. 240 → `wind-from-sw`) and is omitted when `wind.direction` is null
- [ ] 6.4 Run `bun test` — full suite green

## 7. Verification

- [ ] 7.1 Run `prettier --check` on all edited files
- [ ] 7.2 Run `docker build .` to confirm the container builds
- [ ] 7.3 Manually verify on a desktop and a phone-width viewport: a trip with weather shows the pill inline with the others, wraps cleanly on narrow screens, and the wind arrow points from the correct cardinal direction