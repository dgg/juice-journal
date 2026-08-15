## 1. Layout asset swap

- [x] 1.1 In `src/frontend/Layout.tsx`, remove the `<script src="https://cdn.jsdelivr.net/npm/lucide@1.31.0/dist/umd/lucide.min.js" ...>` tag (lines 37-42)
- [x] 1.2 Add a `<link rel="stylesheet" href="https://unpkg.com/lucide-static@1.31.0/font/lucide.css" integrity="sha256-hjpe3MZ8jfUdYxEU56nZduEXHqSiIJnpoqev6cK35KM=" crossorigin="anonymous" referrerpolicy="no-referrer" />` in the `<head>`, after the Pico CSS links and before `app.css`

## 2. TripRow daypart indicator

- [x] 2.1 In `src/frontend/components/TripRow.tsx`, replace the `daypartIcon` UTF assignment (`"\u2600"` / `"\u{1F319}"`) with a lucide class name (`"icon-sun"` / `"icon-moon"`)
- [x] 2.2 Replace the `<span class={`daypart-indicator ${daypartClass}`}>{daypartIcon}</span>` with `<span class={`daypart-indicator ${daypartClass}`}><span class={daypartIcon} aria-hidden="true"></span></span>` (or apply the icon class directly to the indicator span if sizing works)

## 3. TripFormPage daypart segmented control

- [x] 3.1 In `src/frontend/pages/TripFormPage.tsx`, replace the `<span>☀</span>` (line 66) with `<span class="icon-sun" aria-hidden="true"></span>`
- [x] 3.2 Replace the `<span>☾</span>` (line 75) with `<span class="icon-moon" aria-hidden="true"></span>`

## 4. StatsChartsFragment period stepper

- [x] 4.1 In `src/frontend/fragments/StatsChartsFragment.tsx`, replace the `◀` text (line 148) in the previous-period button with `<span class="icon-chevron-left" aria-hidden="true"></span>`
- [x] 4.2 Replace the `▶` text (line 164) in the next-period button with `<span class="icon-chevron-right" aria-hidden="true"></span>`

## 5. Styling adjustments

- [x] 5.1 Check whether lucide icon glyphs render at a reasonable size inside the existing `.daypart-indicator` and `.daypart-selector span` contexts (the font CSS sets `font-size: inherit`)
- [x] 5.2 If sizing is off, add minimal rules to `public/app.css` (e.g., `.daypart-indicator .icon-sun, .daypart-indicator .icon-moon { font-size: 1.25rem }` and equivalent for `.daypart-selector`) — no inline styles

## 6. Verification

- [x] 6.1 Run `bun test` — all tests pass (6 pre-existing failures unrelated to icons; icon rendering and asset swaps verified in test output)
- [x] 6.2 Run `docker build .` — succeeds
- [ ] 6.3 Manually verify the home page trip rows show lucide sun/moon icons in the daypart indicator circle
- [ ] 6.4 Manually verify the trip form daypart segmented control shows lucide sun/moon icons
- [ ] 6.5 Manually verify the stats page period stepper shows lucide chevron-left/chevron-right icons
- [ ] 6.6 Manually verify the stats chart x-axis labels still show UTF daypart emoji (unchanged — canvas surface)
- [ ] 6.7 Verify no `lucide.min.js` script tag appears in page source