## 1. Component

- [x] 1.1 In `src/frontend/components/Header.tsx`, add a `car-front` icon span before the vehicle description: `<span class="icon-car-front" aria-hidden="true"></span>` inline before `{vehicle}` inside the badge `<small>`
- [x] 1.2 In `src/frontend/fragments/StatsChartsFragment.tsx`, add a `car-front` icon span before the vehicle description in the stats period label, using the same pattern as the header badge

## 2. Styling

- [x] 2.1 In `public/app.css`, add `.badge [class^="icon-"] { font-size: 0.875rem }` so the icon matches the badge text size
- [x] 2.2 Verify visually that the icon is vertically centered with the vehicle description text and does not shift the badge baseline

## 3. Tests

- [x] 3.1 Add a test asserting the `Header` renders an `icon-car-front` element inside the badge when `vehicle` is provided
- [x] 3.2 Add a test asserting the `Header` renders no icon when `vehicle` is null
- [x] 3.3 Run `bun test` and ensure all header and stats-related tests pass

## 4. Verification

- [x] 4.1 Run `bun test` — full suite green
- [x] 4.2 Run `prettier --check` on edited files
- [ ] 4.3 Manually verify the home page header badge shows the `car-front` icon before the vehicle description, and the stats page shows the same icon before the vehicle name