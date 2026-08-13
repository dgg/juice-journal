## Context

Five view components (`Header`, `StatCard`, `TripRow`, `Delta`, `EmptyState`) carry inline `style={{...}}` props and use `<div>` elements where semantic elements fit. `public/app.css` currently holds 48 lines of domain-named rules (`sticky-cta`, `delta`, `daypart-indicator`) — the pattern to extend. Pico v2 is loaded via CDN in `Layout.tsx`; `app.css` is served from `/static/app.css` after Pico. No backend, DB, or API involvement.

## Goals / Non-Goals

**Goals:**

- Eliminate every inline `style` attribute from the five components.
- Replace generic `<div>` markup with the correct semantic element per the `frontend-views` delta spec.
- Extend `public/app.css` with domain-named classes that absorb the displaced layout rules.

**Non-Goals:**

- Redesigning the visual appearance — output should be visually equivalent; only the markup/CSS sourcing changes.
- Touching `Layout.tsx`, `StickyCta.tsx`, `pages/*`, or `fragments/*` (they are already clean).
- Changing any backend route, handler, or data shape.
- Introducing a CSS build step, preprocessor, or new dependency.

## Decisions

### Decision 1: Class names are domain-semantic, scoped to the component's role

Class names describe _what the element is in the product domain_, never how it looks. Selected names:

| Class               | Scopes                    | Replaces (inline)                                     |
| ------------------- | ------------------------- | ----------------------------------------------------- |
| `trip-snapshot`     | `<dl>` in `TripRow`       | grid layout, gap, margin on dl/dt/dd                  |
| `stat-card`         | `<article>` in `StatCard` | padding, text-align; `stat-card--hero` variant        |
| `stat-card__value`  | `<data>` wrapper          | font-size/weight delegation to Pico `<strong>` inside |
| `badge`             | `<small>` in `Header`     | pill background, radius, padding                      |
| `trip-row__summary` | `<summary>`               | flex layout, gap, list-style reset                    |
| `trip-row__body`    | expanded `<div>`          | padding, border-top                                   |
| `empty-state`       | `<p>` / container         | centering, padding, muted color                       |

**Alternatives considered:** BEM full naming (`trip-row__summary--daypart`) — rejected as over-engineered for a 5-file refactor; the simpler `trip-row__summary` + state classes (`morning`/`afternoon` already in `app.css`) suffices. Utility classes (`.flex`, `.gap-2`) — explicitly rejected per the spec; they describe appearance, not domain.

### Decision 2: StatCard size variants via modifier, not duplicate rules

The `hero` prop becomes `class="stat-card stat-card--hero"` (or `data-variant="hero"`). The value's large size is delegated to a heading element or `<strong>` inside `<data>`, accepting Pico's native sizing for that element. Avoids two parallel rule blocks.

**Alternatives considered:** `data-variant` attribute selector — equally valid, slightly more modern; deferred since the existing `delta.positive` / `delta.negative` pattern in `app.css` already uses class modifiers and consistency wins.

### Decision 3: TripRow summary heading is `<h3>`

Document outline: `Layout` (no `<h1>`) → `Header` `<h1>` (month) → `HomePage` `<h2>` ("Trips") → `TripRow` `<h3>` (trip date). This gives the trip list a real outline and lets screen-reader users navigate by trip.

**Alternatives considered:** `<h2>` for each trip — would collide with the section "Trips" heading. `<div>` with `role="heading"` — rejected; native `<h3>` is simpler and correct.

### Decision 4: `<time>` uses the trip's `startTime` ISO value

`<time datetime={new Date(trip.startTime).toISOString()}>` — `startTime` is the semantically correct anchor for "when this trip happened." The displayed text is the `start – end` time range.

### Decision 5: StatCard value uses `<data value={n}>` + `<small>` for unit

`<data>` carries the machine-readable numeric value; `<small>` carries the unit as secondary text. Pico styles `<small>` natively. No inline font-size.

### Decision 6: `app.css` grows; no CSS split

All new rules appended to the existing `public/app.css`. At ~80-90 total lines it remains well within a single-file budget. No `components.css` split.

## Risks / Trade-offs

- **Visual regression from accepting Pico defaults** → The `<h1>` in `Header` will render at Pico's default `<h1>` size (larger than the current `1.5rem`). Mitigation: visual review after implementation; if a specific size is required, override via `--pico-*` variable on `:root` rather than an inline style on the element.
- **`<summary>` list-style reset** → Pico/UA default may show a disclosure triangle. The `trip-row__summary` class includes `list-style: none` (and the `-webkit-appearance` fallback where needed) to match the current custom look.
- **`<data>` browser support** → Universally supported; no risk.
- **Class name collision with existing `id="trip-list"`** → The outer section uses `id="trip-list"`; the per-trip `<dl>` uses class `trip-snapshot` — no collision. Deliberately avoided reusing `trip-list` as a class name to prevent the id/class confusion flagged during explore.

## Migration Plan

1. Implement on a feature branch (no git worktrees per `AGENTS.md`).
2. Rewrite the five components and extend `app.css` in commits small enough to review individually.
3. Run `bun test` (no behavioral tests expected to break; view-layer tests, if any, may need snapshot/class updates).
4. Visual review by the user element-by-element; call out discrepancies and patch via `app.css` only.
5. Rollback: revert the branch commits. No schema or data migration to reverse.
