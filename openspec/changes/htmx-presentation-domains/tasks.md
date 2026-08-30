## 1. Create presentation domain files

- [x] 1.1 Create `src/backend/presentation/home.tsx` — move `homeHandler` + `HomeData` interface from `home.tsx`; export a `Hono` instance with `GET /`
- [x] 1.2 Create `src/backend/presentation/trips.tsx` — move `getTripFormPage`, `htmlCreationHandler`, `parseFormTripInput`, `FormBody`, `getPartialTrips` from `html-handlers.tsx`; export a `Hono` instance with `GET /creation`, `POST /`, `GET /fragments/list`
- [x] 1.3 Create `src/backend/presentation/stats.tsx` — move `statsHandler`, `getPartialTripStats`, `computeStatsView`, `parseStatsQuery`, `resolveAnchor`, `formatDateForPeriod`, `isValidDateFormat`, `StatWithDelta`, `StatsView`, and all constants/types from `stats.tsx`; export a `Hono` instance with `GET /`, `GET /fragments/charts`
- [x] 1.4 Create `src/backend/presentation/summary.tsx` — move `getPartialStats` from `html-handlers.tsx`; export a `Hono` instance with `GET /fragments/grid`

## 2. Rewire index.ts

- [x] 2.1 Replace inline HTMX route chain with `app.route()` mounts for `home`, `trips`, `stats`, `summary` domains
- [x] 2.2 Remove old imports from `home.tsx`, `stats.tsx`, `html-handlers.tsx`; import from `presentation/*` instead

## 3. Update frontend imports

- [x] 3.1 Update `StatWithDelta` import in `src/frontend/pages/HomePage.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [x] 3.2 Update `StatsView` import in `src/frontend/pages/StatsPage.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [x] 3.3 Update `StatsView` import in `src/frontend/fragments/StatsChartsFragment.tsx` from `../../backend/stats` to `../../backend/presentation/stats`
- [x] 3.4 Update `StatWithDelta` import in `src/frontend/fragments/StatsSummaryGrid.tsx` from `../../backend/stats` to `../../backend/presentation/stats`

## 4. Update frontend URLs

- [x] 4.1 Update 7 `hx-get="/partials/trip-stats"` references in `StatsChartsFragment.tsx` to `hx-get="/stats/fragments/charts"`
- [x] 4.2 Update `href="/trips/new"` in `HomePage.tsx` to `href="/trips/creation"`
- [x] 4.3 Verify `TripFormPage.tsx` form `action="/trips"` and `hx-post="/trips"` stay unchanged (POST /trips is RESTful, unchanged)

## 5. Update tests

- [x] 5.1 Update `src/backend/home.test.ts` imports: `homeHandler` from `./presentation/home`, `getPartialTrips`/`getPartialStats`/`htmlCreationHandler` from `./presentation/trips` and `./presentation/summary`, `getTripFormPage` from `./presentation/trips`
- [x] 5.2 Update `src/backend/home.test.ts` describe blocks: `GET /partials/trips` → `GET /trips/fragments/list`, `GET /partials/stats` → `GET /summary/fragments/grid`, `GET /trips/new` → `GET /trips/creation`
- [x] 5.3 Update `src/backend/stats.test.ts` import from `./stats.tsx` to `./presentation/stats.tsx`
- [x] 5.4 Update `src/frontend/__tests__/navigation.test.tsx`: all `/trips/new` references → `/trips/creation` (5 occurrences across lines 13, 18, 44, 114, 126)

## 6. Cleanup

- [x] 6.1 Delete `src/backend/html-handlers.tsx` (all handlers moved to presentation domains)
- [x] 6.2 Delete `src/backend/home.tsx` (handler moved to `presentation/home.tsx`)
- [x] 6.3 Delete `src/backend/stats.tsx` (handlers + types moved to `presentation/stats.tsx`)

## 7. Verify

- [x] 7.1 Run `bun test` — all tests pass with updated URLs and imports (30/30 non-DB tests pass; 19 DB failures pre-existing — no PostgreSQL instance)
- [x] 7.2 Run `docker build .` — Docker build succeeds