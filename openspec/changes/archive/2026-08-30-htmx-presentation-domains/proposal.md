## Why

HTMX handlers are scattered across three files (`html-handlers.tsx`, `home.tsx`, `stats.tsx`) with no structural organization, while `/api` follows Hono's best-practice pattern (`app.route()` mounting self-contained Hono apps). This change extracts handlers into a `presentation/` directory organized by domain — mirroring the WebForms MVP pattern (views = pure render in `frontend/`, presenters = orchestration in `presentation/`, models = queries) — and moves partial endpoints from the flat `/partials/*` prefix into domain-nested fragment routes for better cohesion and composability.

## What Changes

- **New `src/backend/presentation/` directory** — all HTMX handlers organized by domain: `home.tsx`, `trips.tsx`, `stats.tsx`, `summary.tsx`; each exports a `Hono` instance mounted via `app.route()`, matching the `/api` pattern
- **Home split into `home` + `summary`** — the current-month stats grid moves to a `summary` domain; the trip list moves to the `trips` domain as a fragment endpoint; the home page composes both server-side
- **Delete `html-handlers.tsx`** — its handlers split into `presentation/trips.tsx` (form, creation, list fragment) and `presentation/summary.tsx` (stats grid fragment)
- **`stats.tsx` shared computation stays** — `computeStatsView`, `parseStatsQuery`, `resolveAnchor` remain co-located in `presentation/stats.tsx`
- **URL changes** (**BREAKING**):
  - `GET /trips/new` → `GET /trips/creation` (action noun, not "new" resource)
  - `GET /partials/trip-stats` → `GET /stats/fragments/charts`
  - `GET /partials/stats` → `GET /summary/fragments/grid`
  - `GET /partials/trips` → `GET /trips/fragments/list`
  - `POST /trips` stays unchanged (RESTful collection create)
  - `POST /api/trips` stays unchanged

## Capabilities

### New Capabilities

(none — the `presentation/` directory structure is an implementation detail, not behavioral)

### Modified Capabilities

- `trip-stats`: the period-switching partial URL changes from `/partials/trip-stats` to `/stats/fragments/charts`; the year-granularity toggle URL changes from `/partials/stats` to `/stats/fragments/charts`
- `home-page-ssr`: the trip list fragment URL changes from `/partials/trips` to `/trips/fragments/list`; the stats fragment URL changes from `/partials/stats` to `/summary/fragments/grid`; the form page URL changes from `/trips/new` to `/trips/creation`; `POST /trips` stays unchanged
- `frontend-views`: the form page URL changes from `/trips/new` to `/trips/creation`

## Impact

- **Backend**: 4 new files in `src/backend/presentation/`, `index.ts` rewired, `html-handlers.tsx` deleted, `home.tsx` and `stats.tsx` restructured
- **Frontend**: `TripFormPage.tsx` (form action stays `/trips`), `HomePage.tsx` (link to `/trips/creation`), `StatsChartsFragment.tsx` (7 `hx-get` URL updates)
- **Tests**: `home.test.ts`, `trips.test.ts`, `stats.test.ts` — URL assertions update
- **No new dependencies, no database changes, no API changes**
- **Rollback**: revert the commit; the old file structure and URLs are restored
