## 1. CSS — Icon sizing rules

- [x] 1.1 Add `.trip-snapshot dt [class^="icon-"]` sizing rule in `public/app.css`
- [x] 1.2 Add `.stat-card__label [class^="icon-"]` sizing rule in `public/app.css`

## 2. TripRow — detail panel icons

- [x] 2.1 Add `icon-route` to Distance `<dt>` in `TripRow.tsx`
- [x] 2.2 Add `icon-hourglass` to Duration `<dt>` in `TripRow.tsx`
- [x] 2.3 Add `icon-gauge` to Avg speed `<dt>` in `TripRow.tsx`
- [x] 2.4 Add `icon-counter` to Odometer `<dt>` in `TripRow.tsx` (conditional rendering already wraps the whole block)
- [x] 2.5 Add `icon-flag` to From `<dt>` in `TripRow.tsx`
- [x] 2.6 Add `icon-flag-triangle-right` to To `<dt>` in `TripRow.tsx`

## 3. TripForm — label icons

- [x] 3.1 Add `icon-calendar` to Date label
- [x] 3.2 Add `icon-clock` to Start time and End time labels
- [x] 3.3 Add `icon-route` to Distance label
- [x] 3.4 Add `icon-counter` to Odometer label
- [x] 3.5 Add `icon-gauge` to Avg speed label
- [x] 3.6 Add `icon-battery-full` to Consumption label
- [x] 3.7 Add `icon-flag` to Start location label
- [x] 3.8 Add `icon-flag-triangle-right` to End location label
- [x] 3.9 Add `icon-car-front` to Vehicle label

## 4. StatCard — label icons

- [x] 3.1 Add `icon-battery-full` to Avg consumption stat label in `StatsChartsFragment.tsx` (or `StatsGrid` in `StatCard.tsx`)
- [x] 3.2 Add `icon-hourglass` to Avg duration stat label
- [x] 3.3 Add `icon-route` to Total distance stat label

## 4. Verify

- [x] 4.1 Build passes (`bun x tsc --noEmit` — no new errors)
- [x] 4.2 Visual check: icons render in trip detail panel and stat cards ✓