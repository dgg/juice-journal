## 1. Helper Functions

- [x] 1.1 Add `prevMonthBoundsUtc(zone, now?)` to `src/utils/dates.ts` (mirror `currentMonthBoundsUtc`, subtract 1 month)
- [x] 1.2 Add unit test for `prevMonthBoundsUtc` in `dates.test.ts`

## 2. Backend Route Setup

- [x] 2.1 Add home route `GET /` in `src/backend/index.ts` wired to new home handler
- [x] 2.2 Create `src/backend/home.ts` with home handler: tz resolution, displayed-vehicle resolution, current+prev month queries, aggregates, location join, template render

## 3. Frontend Template

- [x] 3.1 Create `src/frontend/` directory and home template (Pico HTML)
- [x] 3.2 Implement header with month and vehicle badge
- [x] 3.3 Implement sticky full-width "Log new trip" CTA
- [x] 3.4 Implement hero stat (avg consumption) with MoM delta
- [x] 3.5 Implement secondary stats strip (avg duration + total distance)
- [x] 3.6 Implement trip list with collapsible rows using `<details>`/`<summary>`
- [x] 3.7 Implement empty state display when no trips exist

## 4. Daypart Visualization

- [x] 4.1 Add daypart → icon+color mapping helper (morning ☀ amber / afternoon 🌙 indigo)
- [x] 4.2 Integrate daypart visualization into trip rows

## 5. Formatting

- [x] 5.1 Implement date/time formatting using Luxon for timezone-aware display
- [x] 5.2 Implement numeric formatting for consumption/distance/duration

## 6. Testing

- [x] 6.1 Add tests for home handler: populated month scenario
- [x] 6.2 Add tests for home handler: empty state scenario
- [x] 6.3 Add tests for home handler: NULL-consumption handling
- [x] 6.4 Add tests for home handler: prev-month delta display/hiding
- [x] 6.5 Add tests for home handler: displayed-vehicle selection
- [x] 6.6 Verify `bun test` passes (existing tests unaffected)

## 7. Validation

- [x] 7.1 Test responsive layout on mobile and desktop widths
- [x] 7.2 Verify HTML semantic correctness and PicoCSS integration
- [x] 7.3 Run `docker build .` to ensure deployment still works
- [x] 7.4 Manual test with seeded trip data to verify all features work
