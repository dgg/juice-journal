## Context

The `/api` area follows Hono's best-practice pattern: a self-contained `Hono` instance in `api/trips.ts`, mounted via `app.route("/api", apiTrips)`. The HTMX side does not — handlers are scattered across `html-handlers.tsx` (a grab-bag of trips + stats + form logic), `home.tsx`, and `stats.tsx`, all chained inline on the root app in `index.ts`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Extract HTMX handlers into a `presentation/` directory, one Hono app per domain, mounted via `app.route()` — matching the `/api` pattern
- Move partial endpoints from flat `/partials/*` into domain-nested fragment routes (`/trips/fragments/list`, `/stats/fragments/charts`, `/summary/fragments/grid`)
- Split the home page's internal concerns: `summary` domain owns the current-month stats grid fragment, `trips` domain owns the trip list fragment, `home` composes both server-side
- Change `GET /trips/new` → `GET /trips/creation` (action noun); keep `POST /trips` unchanged (RESTful collection create)

**Non-Goals:**
- No behavioral changes — the same data renders on the same pages; only URLs and file locations change
- No new dependencies, no database changes, no API changes
- No HTMX partials wired to the home page yet — the fragment endpoints exist but are not triggered by `hx-get` in the current frontend (same as today)
- No changes to `POST /api/trips` or the validation layer

## Decisions

### Decision 1: `presentation/` as the directory name (not `routes/` or `handlers/`)

**Choice:** `src/backend/presentation/`

**Rationale:** Mirrors the WebForms MVP pattern this codebase already follows — views (pure render) live in `src/frontend/`, presenters (request orchestration → model → view) live in `src/backend/presentation/`, models (queries) live in `src/backend/db/queries/`. The name "presentation" makes the architectural role explicit: these handlers *present* data as HTML, they don't *contain* it.

**Alternatives considered:**
- `routes/` — describes the URL tree, not the architectural role. The `/api` area isn't called `routes/` either; it's `api/`. Using `presentation/` keeps the naming consistent with a role-based mental model.
- `handlers/` — too generic. Everything is a handler. `presentation/` says *what kind* of handler.

### Decision 2: One Hono app per domain, mounted via `app.route()`

**Choice:** Each domain file exports a `new Hono()` instance with routes chained on it (preserving path-param type inference per Hono best practices). `index.ts` mounts them:
```typescript
app.route("/", homeDomain)
app.route("/trips", tripsDomain)
app.route("/stats", statsDomain)
app.route("/summary", summaryDomain)
```

**Rationale:** Directly mirrors the `/api` pattern (`app.route("/api", apiTrips)`). Chaining `.get()` on the Hono instance preserves Hono's path-param type inference — the documented best practice.

**Alternatives considered:**
- Registration functions (`registerTripsRoutes(app)`) — loses the sub-app pattern, can't use `app.route()`. Colon-literal URLs (`/trips:creation`) would require this, but we chose `/trips/creation` (slash) which works with `app.route()`.
- Single `presentation` Hono app with all routes — no domain isolation, same problem as today at a different level.

### Decision 3: `summary` as a separate domain (not nested under `home`)

**Choice:** `GET /summary/fragments/grid` — a top-level `summary` domain.

**Rationale:** The stats grid fragment is reusable beyond the home page. It's the current-month snapshot of the same stats that the `stats` domain serves with period navigation. Keeping it separate means:
- `home` composes `summary` + `trips` fragments server-side without owning them
- `summary` can grow independently (e.g., weekly summary, yearly summary)
- The `stats` domain stays focused on period-navigable charts; `summary` stays focused on the current-month grid

**Alternatives considered:**
- `/home/fragments/grid` — couples the fragment to the home page. The stats grid isn't home-specific; it's a current-month summary that happens to appear on the home page.
- `/stats/fragments/summary` — couples it to the stats domain. But `stats` has period navigation and charts; the summary grid is a different concern (fixed current month, no navigation, no charts).

### Decision 4: `GET /trips/creation` (not `GET /trips/:create`)

**Choice:** Literal path `/creation` under the `trips` domain.

**Rationale:** Trip IDs are 16-char nanoids — no trip will ever have ID `"creation"`. Hono literal routes take precedence over param routes, so `GET /trips/creation` will never conflict with a future `GET /trips/:id`. The literal path avoids the catch-all behavior of `:create` (which would match `/trips/anything`).

**Alternatives considered:**
- `/trips/:create` — catch-all param. Would match `/trips/foo` and render the form. Harmless but misleading — the form renders for paths that aren't "creation."
- `/trips:new` (colon literal) — can't be mounted via `app.route()` with a sub-app; requires direct registration on the root app. Breaks Decision 2.

### Decision 5: Shared computation stays in `presentation/stats.tsx`

**Choice:** `computeStatsView`, `parseStatsQuery`, `resolveAnchor`, `formatDateForPeriod`, `isValidDateFormat` stay co-located in `presentation/stats.tsx`, imported by the stats page handler and the charts fragment handler.

**Rationale:** Both the stats page (`GET /stats`) and the charts fragment (`GET /stats/fragments/charts`) call `computeStatsView`. Co-locating the shared computation with its callers maximizes cohesion — a developer working on stats finds everything in one file. Extracting to a `services/` layer would split the stats domain across two directories for no benefit (there's no cross-domain reuse of this computation).

## Risks / Trade-offs

- **[Risk] Breaking URL change for existing bookmarks/links** → All `/partials/*` URLs and `/trips/new` change. No external consumers known (HTMX-only, no public API). Frontend `hx-get` attributes and test assertions must update in the same commit. Rollback: revert the commit.

- **[Risk] `getPartialTrips` and `getPartialStats` are tested but not wired to any `hx-get`** → They move to `presentation/trips.tsx` and `presentation/summary.tsx` respectively. Tests update URLs. No behavior change — they remain available for future HTMX wiring.

- **[Trade-off] `presentation/stats.tsx` grows large** → It carries the page handler, the fragment handler, and all shared computation (~290 lines). This is the same size as the current `stats.tsx`. Splitting would reduce cohesion. Acceptable until a second caller needs `computeStatsView`.

- **[Trade-off] Two files for trips form + creation** → `GET /trips/creation` (form render) and `POST /trips` (creation) live in the same `presentation/trips.tsx` file. The form GET and the POST are the same domain (trips) even though they have different verbs. Acceptable — a developer looking for "how does trip creation work" finds both in one file.
