## 1. app.css foundation

- [x] 1.1 Add domain-named layout rules to `public/app.css`: `trip-snapshot` (dl grid), `trip-snapshot dt`, `trip-snapshot dd`
- [x] 1.2 Add `trip-row__summary` rule and `trip-row__body` rule
- [x] 1.3 Add `stat-card` base rule and `stat-card--hero` modifier
- [x] 1.4 Add `small.badge` rule
- [x] 1.5 Add `empty-state` rule

## 2. Header.tsx

- [x] 2.1 Replace inline-styled `<h1>` with `<h1>` accepting Pico default sizing
- [x] 2.2 Replace inline-styled `<span>` vehicle pill with `<small class="badge">{vehicle}</small>`
- [x] 2.3 Replace inline-styled `<header>` with `<header class="page-header">`

## 3. TripRow.tsx

- [x] 3.1 Replace date `<div>` with `<h3>`
- [x] 3.2 Replace time `<div>` with `<time datetime={...}>` + `trip-row__time` class
- [x] 3.3 Replace consumption `<div>` with `<data>` + `trip-row__consumption` class
- [x] 3.4 Replace inline-styled `<summary>` with `<summary class="trip-row__summary">`
- [x] 3.5 Replace inline-styled detail body `<div>` with `<div class="trip-row__body">`
- [x] 3.6 Replace inline-styled `<dl>` with `<dl class="trip-snapshot">`; remove `style` from all `<dt>` and `<dd>`
- [x] 3.7 Remove redundant `<small>` wrappers inside `<dt>` elements

## 4. StatCard.tsx

- [x] 4.1 Replace inline-styled `<article>` with `<article class="stat-card">` / `stat-card--hero`
- [x] 4.2 Replace value `<div>` with `<p class="stat-card__value"><data value={...}>...</data> <small>{unit}</small></p>`
- [x] 4.3 Replace label `<div>` with `<small class="stat-card__label">`
- [x] 4.4 Replace both inline-styled `<div>` grids with `stats-grid` and `stats-grid__row` classes

## 5. Delta.tsx and EmptyState.tsx

- [x] 5.1 Replace `<div class="delta ...">` with `<p class="delta ...">`; move `font-size`/`margin-top` into `.delta` rule
- [x] 5.2 Replace `<div><p>...</p></div>` with `<p class="empty-state">`

## 6. Verification

- [x] 6.1 Ran `bun test` — 3 pre-existing DB-state failures unrelated to changes, user confirmed to ignore
- [x] 6.2 Zero inline `style` attributes confirmed via grep
- [x] 6.3 Visual review with the user element-by-element — user reviewed, only issue was consumption whitespace (fixed with `trip-row__title { flex: 1 }`)