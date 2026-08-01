## 1. Helper Functions

- [ ] 1.1 Add `prevMonthBoundsUtc(zone, now?)` to `src/utils/dates.ts` (mirror `currentMonthBoundsUtc`, subtract 1 month)  
- [ ] 1.2 Add unit test for `prevMonthBoundsUtc` in `dates.test.ts`

## 2. Backend Route Setup

- [ ] 2.1 Add home route `GET /` in `src/backend/index.ts` wired to new home handler
- [ ] 2.2 Create `src/backend/home.ts` with home handler: tz resolution, displayed-vehicle resolution, current+prev month queries, aggregates, location join, template render

## 3. Frontend Template

- [ ] 3.1 Create `src/frontend/` directory and home template (Pico HTML)
- [ ] 3.2 Implement header with month and vehicle badge
- [ ] 3.3 Implement sticky full-width "Log new trip" CTA
- [ ] 3.4 Implement hero stat (avg consumption) with MoM delta
- [ ] 3.5 Implement secondary stats strip (avg duration + total distance)
- [ ] 3.6 Implement trip list with collapsible rows using `<details>`/`<summary>`
- [ ] 3.7 Implement empty state display when no trips exist

## 4. Daypart Visualization

- [ ] 4.1 Add daypart → icon+color mapping helper (morning ☀ amber / afternoon 🌙 indigo)
- [ ] 4.2 Integrate daypart visualization into trip rows

## 5. Formatting

- [ ] 5.1 Implement date/time formatting using Luxon for timezone-aware display
- [ ] 5.2 Implement numeric formatting for consumption/distance/duration

## 6. Testing

- [ ] 6.1 Add tests for home handler: populated month scenario
- [ ] 6.2 Add tests for home handler: empty state scenario  
- [ ] 6.3 Add tests for home handler: NULL-consumption handling
- [ ] 6.4 Add tests for home handler: prev-month delta display/hiding
- [ ] 6.5 Add tests for home handler: displayed-vehicle selection
- [ ] 6.6 Verify `bun test` passes (existing tests unaffected)

## 7. Validation

- [ ] 7.1 Test responsive layout on mobile and desktop widths
- [ ] 7.2 Verify HTML semantic correctness and PicoCSS integration
- [ ] 7.3 Run `docker build .` to ensure deployment still works
- [ ] 7.4 Manual test with seeded trip data to verify all features work