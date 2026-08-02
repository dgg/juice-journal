## Why

The home page (`src/backend/home.ts`) fuses data fetching, view rendering, and ~140 lines of inline `<style>` into a single 403-line backend file. HTML lives as template strings with hand-rolled `escapeHtml`; CSS is buried inside JS strings — no editor help, no linting, no reuse. Adding `/trips/new` would duplicate the whole shell. This violates the AGENTS.md intent (separate `src/frontend/`, Pico-grounded styling) and makes future pages costly to build.

## What Changes

- Introduce `hono/jsx` server-side components (`src/frontend/`) as the sole HTML source — no client bundle ships.
- Split views into `components/` (reusable atoms), `pages/` (full-doc, `Layout`-wrapped), and `fragments/` (bare region markup for HTMX swaps).
- Add HTMX-native interaction: `hx-boost` for nav, region fragment routes (`GET /partials/*`), and `hx-swap-oob` for multi-region updates from a single response.
- Add a pure CSS `public/app.css` served statically via `Bun.file`, Pico-grounded per the styling rules of preference (Pico native → `--pico-*` overrides → custom CSS last resort).
- Migrate home page off inline `<style>`: most custom CSS dies under Pico rules; ~15-20 lines survive to `app.css`.
- Add `POST /trips` (HTML response, HTMX form) returning the new `TripRow` + OOB stats refresh. `POST /api/trips` (JSON) stays for tooling.
- Add new page `/trips/new` — trip creation form posting to `/trips`, reusing shared components.
- Update `tsconfig.json` with `jsxImportSource: hono/jsx` and `.tsx` support.

## Capabilities

### New Capabilities
- `frontend-views`: Conventions for server-rendered view components (`hono/jsx`), component/page/fragment layering, `Layout` composition, and the static `app.css` stylesheet contract.

### Modified Capabilities
- `home-page-ssr`: View rendering moves from inline template strings in a backend handler to typed JSX components under `src/frontend/`; same user-facing behavior (stats, trip list, expand, CTA, deltas, empty state, responsive). Adds `GET /partials/trips` and `GET /partials/stats` fragment routes and `POST /trips` HTML endpoint for HTMX-driven region updates.

## Impact

- **Code**: `src/backend/home.ts` shrinks to data-fetch + `<HomePage/>` call. New `src/frontend/` tree (`Layout.tsx`, `components/`, `pages/`, `fragments/`, `format.ts`). New `public/app.css`. Static-serving route added in `src/backend/index.ts`.
- **APIs**: Adds `POST /trips` (HTML) and `GET /partials/trips`, `GET /partials/stats`. `POST /api/trips` (JSON) unchanged. `GET /` and `GET /api/trips` unchanged in behavior.
- **Dependencies**: None new — `hono/jsx` ships with installed `hono@4.12.29`; HTMX already an approved dependency.
- **Config**: `tsconfig.json` gains `jsx`/`jsxImportSource` settings.
- **Tests**: Home handler tests refit to assert rendered HTML from components; add fragment route + OOB response assertions.

## Rollback

- Revert `AGENTS.md`, `tsconfig.json`, `src/backend/index.ts` static route.
- Delete `src/frontend/` and `public/app.css`; restore prior `src/backend/home.ts` from git history.
- Fragment routes and `POST /trips` are additive — removing them affects no existing JSON contract.
