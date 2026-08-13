## Context

See `proposal.md` for motivation. Current state: `src/backend/home.ts` (403 lines) fuses data fetch, a `renderHomePage` template-string function, `renderTripRow`/`renderDelta` partials, and ~140 lines of inline `<style>`. `src/backend/handlers.ts` returns JSON only. No `src/frontend/` tree exists despite AGENTS.md naming it. `hono@4.12.29` is installed; `hono/jsx`, `hono/html`, and the `jsxRenderer` middleware ship with it — no new dependency. Bun runs `.tsx` natively with no build step.

## Goals / Non-Goals

**Goals:**

- Sole HTML source = typed `hono/jsx` components under `src/frontend/`.
- HTMX-native interaction: boosted nav + region fragment routes + OOB swaps — no client JS authored.
- Pure CSS `public/app.css`, Pico-grounded, served statically; inline `<style>` eliminated.
- `/trips/new` form page reusing shared components, posting via HTMX to a new HTML endpoint.
- Reversibility: the HTMX layer is removable; components remain load-bearing for full-page rendering.

**Non-Goals:**

- Extended stats / Chart.js pages (future change).
- `GET /api/trips` JSON behavior or shape (unchanged).
- Database schema or trip data-structure changes.
- Client-side JS frameworks; `hono/jsx` is SSR only.
- Multi-vehicle selection UI.

## Decisions

### Decision 1: `hono/jsx` as the templating engine (SSR components)

HTML is produced by `.tsx` components compiled to function calls and stringified at request time. Nothing ships to the browser beyond HTML + HTMX + Pico/Chart.js assets.

**Why over alternatives:**

- Template-literal view modules (option A): HTML stays a string — rejected by the user; same string-escape foot-guns (`escapeHtml`), no editor/lint support.
- Static `.html` files with token fills (option B): reinvents a templating engine for no gain; no typing or composition.
- `hono/jsx` ships with installed Hono; Bun renders `.tsx` natively. Auto-escaping removes `escapeHtml`. Components compose via props/children. Type-checked props. Editor jump-to-def/autocomplete.

**Cost:** new file type (`.tsx`), `tsconfig.json` `jsxImportSource: "hono/jsx"`. AGENTS.md updated to allow SSR JSX (no client runtime).

### Decision 2: C+D hybrid — components render, HTMX composes in the browser

JSX components are the only HTML source for both full pages and fragments. HTMX (`hx-boost`, `hx-get`, `hx-swap-oob`) attaches to shells/pages and drives region swaps in the browser. The server emits fragments (bare components) for region routes and OOB refresh.

```
          JSX components (.tsx) = sole HTML source
                    │
       ┌────────────┴───────────────┐
       ▼                            ▼
 pages/ (Layout-wrapped)       fragments/ (bare)
 GET / GET /trips/new          GET /partials/*
                               POST /trips (HTML + OOB)
```

**Why over D-only (string fragments):** the user rejects returning HTML as strings. Components let fragments be typed, reusable, and auto-escaped — the same atom (`TripRow`) serves the full page, the trip-list fragment, and the OOB row append.

**Why over C-only (no HTMX):** future pages (extended stats) and the trip-logging flow benefit from region refresh without full reload. HTMX is an approved dependency and is idiomatic for the stack.

**Layering rule:** `components/` = atoms with no `hx-*` or page knowledge. `pages/` and `fragments/` are thin shells that compose atoms and attach HTMX wiring. Atoms stay portable across full-page and fragment contexts.

### Decision 3: View file structure

```
src/frontend/
├─ Layout.tsx              ← <head> (Pico + app.css), wraps <body>
├─ components/             ← atoms, reusable, no HTMX wiring
│  ├─ TripRow.tsx
│  ├─ StatsGrid.tsx
│  ├─ Header.tsx
│  ├─ StatCard.tsx
│  ├─ StickyCta.tsx
│  └─ EmptyState.tsx
├─ pages/                  ← full-doc composition
│  ├─ HomePage.tsx
│  └─ TripFormPage.tsx
├─ fragments/              ← bare composition for region routes + OOB
│  ├─ TripListFragment.tsx
│  ├─ StatsFragment.tsx
│  └─ TripCreatedResponse.tsx   ← new TripRow + OOB StatsGrid
└─ format.ts               ← formatNumber (pure; escaping handled by JSX)
```

### Decision 4: Static serving of `app.css` via `Bun.file`

A single route serves files from `public/`:

```ts
app.use("/static/*", serveStatic({ root: "./" })) // hono/bun
// or Bun-native: new Response(Bun.file(`./public${path.slice(7)}`))
```

`Bun.file` returns a streaming `Blob`-backed `Response`, zero-copy, no dependency — matches AGENTS.md "internal Bun APIs preferred." Layout loads Pico then `app.css` so app rules win the cascade.

### Decision 5: POST contract split — `/api/trips` (JSON) vs `/trips` (HTML)

- `POST /api/trips` stays JSON for tooling/API consumers. Unchanged.
- `POST /trips` accepts form-encoded submissions (HTMX forms) and returns HTML: the new `TripRow` with `hx-swap-oob="beforeend:#trip-list"` plus a refreshed `StatsGrid` with `hx-swap-oob="true"`. One response updates both regions.

**Why split over header-branching:** two honest contracts, each tailored to its consumer. No `HX-Request` magic branching mixing concerns. The JSON API stays pure; the UI speaks HTML.

**Alternatives considered:** branch `POST /api/trips` on `HX-Request` header — fewer routes but mixes JSON/HTML semantics in one handler. Rejected for clarity.

### Decision 6: CSS migration — audit the inline `<style>` against Pico rules

The ~140-line `<style>` is audited line-by-line against the 3-tier rule (Pico native → `--pico-*` overrides → `app.css` last resort):

```
dies (rule #1, Pico/semantic):  .container, .header-bar flex, .stats-grid grid,
                                .hero-stat padding/radius, .trip-details dl grid,
                                most layout — Pico + semantic HTML covers
override/keep (rule #2):        :root --daypart-* vars (override)
survives (rule #3):             .daypart-indicator.* colors, .sticky-cta,
                                .delta.positive/.negative colors (~15-20 lines)
```

Survivors move to `public/app.css`. The audit is performed during implementation (tasks.md) and recorded as the canonical CSS for the migrated page.

### Decision 7: Reversibility — D sits on top of C

```
C (components)  ─── stable core, always renders full pages ──
       │
D (hx-* attrs + fragment routes) ─── removable skin ──
       │
drop D → pages still render full doc. C intact.
drop C → nothing renders. D depends on C.
```

Components are load-bearing; HTMX wiring and fragment routes are an enhancement layer. "Feel wrong later" recovery = drop fragment routes + `hx-*` attrs; components and pages still serve full documents.

## Risks / Trade-offs

- [`.tsx` unfamiliarity] → Mitigation: small surface (props, `FC`, children, `<>...</>` fragments); ~1hr learning. Atoms are simple functions.
- [`hono/jsx` async components can tempt data-fetching in render] → Mitigation: keep data fetching in backend handlers; components are pure functions of props. No `await` in render.
- [HTMX OOB learning curve] → Mitigation: start with `hx-boost` (near-zero config) for nav; add OOB only on `POST /trips`. Document the OOB response shape in `TripCreatedResponse.tsx`.
- [CSS audit subjective] → Mitigation: task records line-by-line decisions; reviewer can challenge each rule's tier placement.
- [Two POST endpoints could drift in validation] → Mitigation: share the Zod validators + conflict validator middleware across both routes; only the response format differs.

## Migration Plan

1. Configure `tsconfig.json` (`jsx`, `jsxImportSource`) and verify `bun test` still passes.
2. Add static-serving route for `/static/*` → `public/`.
3. Create `Layout.tsx` + atoms; migrate `home.ts` render logic to `HomePage.tsx` + `TripRow.tsx` etc. Backend `homeHandler` reduces to data fetch + `c.html(<HomePage/>)`.
4. Audit inline `<style>` → write `public/app.css`; verify visual parity.
5. Add fragment routes `GET /partials/trips`, `GET /partials/stats`.
6. Add `POST /trips` HTML endpoint returning `TripCreatedResponse` (row + OOB stats).
7. Add `/trips/new` form page posting to `/trips`.
8. Enable `hx-boost` on `<body>` in `Layout`.
9. Update tests; run `bun test` and `docker build .`.

**Rollback:** revert `AGENTS.md`, `tsconfig.json`, static route; delete `src/frontend/` and `public/app.css`; restore prior `home.ts` from git. Fragment routes and `POST /trips` are additive and affect no existing JSON contract.

## Open Questions

- Exact `TripCreatedResponse` swap targets: append new row at `beforeend:#trip-list` vs replace whole list fragment. Recommend `beforeend` for performance; revisit if list ordering (newest-first) makes append awkward — may need `afterbegin` or full fragment replace.
- Whether `/partials/*` routes should accept query params for month/vehicle selection (future multi-vehicle), or stay current-month-only for v1. Recommend current-month-only; add params when selection UI lands.
