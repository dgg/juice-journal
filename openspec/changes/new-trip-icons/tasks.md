## 1. CSS — Icon sizing rules

- [ ] 1.1 Add `.trip-snapshot dt [class^="icon-"]` sizing rule in `public/app.css`
- [ ] 1.2 Add `.stat-card__label [class^="icon-"]` sizing rule in `public/app.css`

## 2. TripRow — detail panel icons

- [ ] 2.1 Add `icon-route` to Distance `<dt>` in `TripRow.tsx`
- [ ] 2.2 Add `icon-hourglass` to Duration `<dt>` in `TripRow.tsx`
- [ ] 2.3 Add `icon-gauge` to Avg speed `<dt>` in `TripRow.tsx`
- [ ] 2.4 Add `icon-counter` to Odometer `<dt>` in `TripRow.tsx` (conditional rendering already wraps the whole block)
- [ ] 2.5 Add `icon-flag` to From `<dt>` in `TripRow.tsx`
- [ ] 2.6 Add `icon-flag-triangle-right` to To `<dt>` in `TripRow.tsx`

## 3. StatCard — label icons

- [ ] 3.1 Add `icon-battery-full` to Avg consumption stat label in `StatsChartsFragment.tsx` (or `StatsGrid` in `StatCard.tsx`)
- [ ] 3.2 Add `icon-hourglass` to Avg duration stat label
- [ ] 3.3 Add `icon-route` to Total distance stat label

## 4. Verify

- [ ] 4.1 Build passes (`bun run build` or `bun check`)
- [ ] 4.2 Visual check: icons render in trip detail panel and stat cards