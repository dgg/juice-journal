## 1. app.css foundation

- [ ] 1.1 Add domain-named layout rules to `public/app.css`: `trip-snapshot` (dl grid: `display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem; margin: 0.75rem 0 0 0`), `trip-snapshot dt` (color: `var(--pico-muted-color)`), `trip-snapshot dd` (margin: 0, font-weight: 500)
- [ ] 1.2 Add `trip-row__summary` rule (padding, flex, align-items, gap, cursor, list-style reset + `-webkit-appearance: none` fallback for the disclosure marker) and `trip-row__body` rule (padding, border-top)
- [ ] 1.3 Add `stat-card` base rule (Pico `<article>` already covers background/padding/radius — add only `text-align: center` if needed) and `stat-card--hero` modifier (larger padding / centering)
- [ ] 1.4 Add `badge` rule (background `var(--pico-primary-background)`, color `var(--pico-primary-inverse)`, padding, border-radius: 9999px) scoped to `small.badge`
- [ ] 1.5 Add `empty-state` rule (text-align center, padding, color `var(--pico-muted-color)`)

## 2. Header.tsx

- [ ] 2.1 Replace inline-styled `<h1>` with `<h1>` accepting Pico default sizing (remove `style={{ fontSize, fontWeight, margin }}`)
- [ ] 2.2 Replace inline-styled `<span>` vehicle pill with `<small class="badge">{vehicle}</small>`
- [ ] 2.3 Remove inline styles from the `<header>` wrapper; if flex layout is still needed, add a `page-header` class to `app.css` (domain-named) — decide based on whether Pico's native `<header>` styling suffices

## 3. TripRow.tsx

- [ ] 3.1 Replace the date `<div style={{ fontWeight: 600, fontSize: ... }}>` with `<h3 class="trip-row__date">{dateStr}</h3>`; add `trip-row__date` rule to `app.css` only if Pico's `<h3>` default needs adjustment (otherwise omit)
- [ ] 3.2 Replace the time `<div style={{...}}>` with `<time datetime={new Date(trip.startTime).toISOString()} class="trip-row__time">{timeStr}</time>`; add `trip-row__time` rule (font-size: 0.875rem, color: `var(--pico-muted-color)`)
- [ ] 3.3 Replace the consumption `<div style={{...}}>` with a semantic element (`<data value={trip.avgConsumptionKwh100km ?? ""} class="trip-row__consumption">` or `<strong>`) and move styling to `app.css`
- [ ] 3.4 Replace inline-styled `<summary>` with `<summary class="trip-row__summary">`; the inner flex container becomes a `<div class="trip-row__summary-main">` only if no semantic alternative fits
- [ ] 3.5 Replace the inline-styled detail body `<div>` with `<div class="trip-row__body">`
- [ ] 3.6 Replace the inline-styled `<dl>` with `<dl class="trip-snapshot">`; remove `style` from every `<dt>` and `<dd>` — they inherit from the `trip-snapshot` rules added in 1.1
- [ ] 3.7 Remove the now-redundant `<small>` wrappers inside `<dt>` elements (the `trip-snapshot dt` rule handles sizing/color directly)

## 4. StatCard.tsx

- [ ] 4.1 Replace inline-styled `<article>` with `<article class="stat-card">` (and `stat-card--hero` when `hero` is true)
- [ ] 4.2 Replace the value `<div style={{...}}>` with `<p class="stat-card__value"><data value={stat.value ?? ""}>{formattedValue}</data> <small>{stat.unit}</small></p>`; move any remaining sizing to `stat-card__value` and the `--hero` modifier
- [ ] 4.3 Replace the label `<div style={{...}}>` with `<small class="stat-card__label">{stat.label}</small>` or `<p class="stat-card__label">`; move styling to `app.css`
- [ ] 4.4 Replace the `StatsGrid` outer inline-styled `<div>` with Pico's `<div class="grid">` pattern (already used in `TripFormPage`); replace the inner 2-up grid likewise, adding a `stats-grid` wrapper class only if Pico's `.grid` doesn't cover the margin-bottom need

## 5. Delta.tsx and EmptyState.tsx

- [ ] 5.1 Replace `<div class="delta ...">` with `<p class="delta ...">`; move `font-size`/`margin-top` into the existing `.delta` rule in `app.css`
- [ ] 5.2 Replace `EmptyState`'s inline-styled wrapper `<div>` and `<p>` with `<p class="empty-state">No trips yet — log your first commute</p>` (or `<article class="empty-state"><p>...</p></article>` if grouping is needed); styling lives in the `empty-state` rule from 1.5

## 6. Verification

- [ ] 6.1 Run `bun test` and confirm no behavioral test failures; update any view-layer snapshot/class assertions that broke
- [ ] 6.2 Run `rg "style=\{\{" src/frontend/` and `rg "style=\"" src/frontend/` and confirm zero matches
- [ ] 6.3 Visual review with the user element-by-element (home page, trip form page, expanded trip row, empty state); patch any discrepancies via `app.css` only — no re-introduction of inline styles
