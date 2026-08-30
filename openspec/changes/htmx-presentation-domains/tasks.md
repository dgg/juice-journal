## 1. Create presentation domain files

- [ ] 1.1 Create `src/backend/presentation/home.tsx` — move `homeHandler` + `HomeData` interface from `home.tsx`; export a `Hono` instance with `GET /`
- [ ] 1.2 Create `src/backend/presentation/trips.tsx` — move `getTripFormPage`, `htmlCreationHandler`, `parseFormTripInput`, `FormBody`, `getPartialTrips` from `html-handlers.tsx`; export a `Hono` instance with `GET /creation`, `POST /`, `GET /fragments/list`
- [ ] 1.3 Create `src/backend/presentation/stats.tsx` — move `statsHandler`, `getPartialTripStats`, `computeStatsView`, `parseStatsQuery`, `resolveAnchor`, `formatDateForPeriod`, `isValidDateFormat`, `StatWithDelta`, `StatsView`, and all constants/types from `stats.tsx`; export a `Hono` instance with `GET /`, `GET /fragments/charts`
- [ ] 1.4 Create `src/backend/presentation/summary.tsx` — move `getPartialStats` from `html-handlers.tsx`; export a `Hono` instance with `GET /fragments/grid`

## 2. Rewire index.ts

- [ ] 2.1 Replace inline HTMX route chain with `app.route()` mounts for `home`, `trips`, `stats`, `summary` domains
- [ ] 2.2 Remove old imports from `home.tsx`, `stats.tsx`, `html-handlers.tsx`; import from `presentation/*` instead

## 3. Update frontend imports

- [ ] 3.1 Update `StatWithDelta` import in `src/frontend/pages/HomePage.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [ ] 3.2 Update `StatsView` import in `src/frontend/pages/StatsPage.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [ ] 3.3 Update `StatsView` import in `src/frontend/fragments/StatsChartsFragment.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [ ] 3.4 Update `StatWithDelta` import in `src/frontend/fragments/StatsSummaryGrid.tsx` from `../../backend/stats` to `../../backend/presentation/stats`

## 4. Update frontend URLs

- [ ] 4.1 Update 7 `hx-get="/partials/trip-stats"` references in `StatsChartsFragment.tsx` to `hx-get="/stats/fragments/charts"`
- [ ] 4.2 Update `href="/trips/new"` in `HomePage.tsx` to `href="/trips/creation"`
- [ ] 4.3 Verify `TripFormPage.tsx` form `action="/trips"` and `hx-post="/trips"` stay unchanged (POST /trips is RESTful, unchanged)

## 5. Update tests

- [ ] 5.1 Update `src/backend/home.test.ts` imports: `homeHandler` from `./presentation/home`, `getPartialTrips`/`getPartialStats`/`htmlCreationHandler` from `./presentation/trips` and `./presentation/summary`, `getTripFormPage` from `./presentation/trips`
- [ ] 5.2 Update `src/backend/home.test.ts` describe blocks: `GET /partials/trips` → `GET /trips/fragments/list`, `GET /partials/stats` → `GET /summary/fragments/grid`, `GET /trips/new` → `GET /trips/creation`
- [ ] 5.3 Update `src/backend/stats.test.ts` import from `./stats.tsx` to `./presentation/stats.tsx`
- [ ] 5.4 Update `src/frontend/__tests__/navigation.test.tsx`: all `/trips/new` references → `/trips/creation` (5 occurrences across lines 13, 18, 44, 114, 126)

## 6. Cleanup

- [ ] 6.1 Delete `src/backend/html-handlers.tsx` (all handlers moved to presentation domains)
- [ ] 6.2 Delete `src/backend/home.tsx` (handler moved to `presentation/home.tsx`)
- [ ] 6.3 Delete `src/backend/stats.tsx` (handlers + types moved to `presentation/stats.tsx`)

## 7. Verify

- [ ] 7.1 Run `bun test` — all tests pass with updated URLs and imports
- [ ] 7.2 Run `docker build .` — Docker build succeeds
