## 1. Clean up prototypes

- [ ] 1.1 Delete `src/frontend/fragments/StatsPrototypeFragment.tsx`
- [ ] 1.2 Delete `src/frontend/pages/StatsPrototypePage.tsx`
- [ ] 1.3 Remove prototype imports and handlers from `src/backend/stats.tsx`
- [ ] 1.4 Remove prototype routes (`/stats/offset`, `/stats/ref-date`, `/stats/offset-and-ref`) from `src/backend/index.ts`
- [ ] 1.5 Remove prototype-specific CSS from `public/app.css` if not reused

## 2. Backend: anchor parsing and StatsView extension

- [ ] 2.1 Add `date` query param parsing to `parseStatsQuery` — validate format per period (`YYYY-Www` for week, `YYYY-MM` for month, `YYYY` for year), return 400 on invalid
- [ ] 2.2 Add `resolveAnchor` helper — convert `date` string to `DateTime` in the display timezone, fallback to `DateTime.now()` when absent or empty
- [ ] 2.3 Extend `StatsView` interface with `prevDate: string | null` and `nextDate: string | null` fields
- [ ] 2.4 In `computeStatsView`, compute `prevDate` and `nextDate` from the anchor (adjacent period in the period's date format); set `nextDate` to null when anchor period ≥ current period
- [ ] 2.5 Replace `DateTime.now()` in `statsHandler` and `getPartialTripStats` with the resolved anchor
- [ ] 2.6 Include `date`, `prevDate`, `nextDate` in the view so the fragment can render them

## 3. Backend: year picker data

- [ ] 3.1 Add `findEarliestTripYear` query to `src/db/queries/trips.ts` (returns earliest `end_time` year, or null)
- [ ] 3.2 Call it in `computeStatsView` when period is year, pass the year range to `StatsView` as `yearOptions: number[]`

## 4. Frontend: navigation control

- [ ] 4.1 Replace the static `.stats-period-label` in `StatsChartsFragment` with the period navigation control: ◀ button, picker, ▶ button
- [ ] 4.2 Render picker per period type: `<input type="week">`, `<input type="month">`, `<select>` (year options from `yearOptions`)
- [ ] 4.3 Wire picker with `hx-trigger="change"`, `hx-get="/partials/trip-stats"`, `hx-target="#stats-region"`, `hx-swap="outerHTML"`, `hx-vals` including `date` from `this.value` plus `period` and `yearGranularity`
- [ ] 4.4 Wire ◀ button as an HTMX anchor with `hx-get` targeting `prevDate`, ▶ button targeting `nextDate`
- [ ] 4.5 Set `disabled` on ▶ button when `nextDate` is null
- [ ] 4.6 Set picker `value` to the current anchor's date format on every render
- [ ] 4.7 Keep period switcher and year-granularity toggle carrying the current `date` param in their HTMX requests

## 5. Styling

- [ ] 5.1 Refine `.period-stepper` styles in `public/app.css` for the production control (picker flanked by stepper buttons)
- [ ] 5.2 Ensure the nav control is responsive — picker and buttons visible on phone, charts hidden (existing `@media` rule)

## 6. Tests

- [ ] 6.1 Test `parseStatsQuery` accepts valid `date` params per period and rejects invalid ones with 400
- [ ] 6.2 Test `resolveAnchor` returns the correct `DateTime` for each period format and falls back to now when absent
- [ ] 6.3 Test `computeStatsView` computes `prevDate`/`nextDate` correctly for each period
- [ ] 6.4 Test `nextDate` is null when anchor period equals current period
- [ ] 6.5 Test `StatsChartsFragment` renders picker with correct `value`, ◀/▶ with correct hrefs, and ▶ disabled at current period
- [ ] 6.6 Test clearing the picker (empty `date`) defaults to current period
- [ ] 6.7 Test year `<select>` renders options from `yearOptions` with anchor year selected
- [ ] 6.8 Run `bun test` and `bun tsc --noEmit` — no new failures
