## Context

See `proposal.md` for motivation. The current `TripRow` component (`src/frontend/components/TripRow.tsx`) renders the expanded body as a `<dl class="trip-snapshot">` with `grid-template-columns: auto 1fr` (`app.css:132`). Each detail is a `<dt>` (icon + label) + `<dd>` (value + unit) pair, stacking vertically. The summary (daypart icon, date, time range, consumption) stays unchanged.

## Goals / Non-Goals

**Goals:**

- Restyle the expanded trip detail body as inline pills that flow and wrap to fill horizontal space on any viewport.
- Preserve the semantic `<dl>` structure — each pill is a `<dd>` with its `<dt>` visually hidden as an sr-only semantic label.
- Combine From/To into a single route pill using the `circle-arrow-right` icon.
- Ground all pill styling in Pico CSS variables. No inline styles, no new framework.

**Non-Goals:**

- Changing the summary row (daypart, date, time, consumption) — it stays as-is.
- Removing the expand/collapse `<details>` pattern — pills are still revealed on demand.
- Changing the trip data payload or query layer.
- Spec-level changes — layout is an implementation detail (`skip_specs: true`).

## Decisions

### Decision 1: Each pill is a `<dd>` with sr-only `<dt>`, not a `<span>`

Each detail remains a `<dt>` + `<dd>` pair. The `<dt>` carries the semantic label ("Distance", "Duration", "Route") and is visually hidden via an sr-only class. The `<dd>` is styled as the pill and contains `icon + value + unit`.

**Why:** the user explicitly asked to keep the semantic `<dl>` structure. Using `<dt>`/`<dd>` preserves screen-reader semantics (term + description). Hiding the `<dt>` visually but keeping it in the DOM means assistive tech still announces "Distance: 15.0 km" even though sighted users see only `📍 15.0 km`.

**Alternatives considered:**

- `<ul>` of `<li>` pills with `aria-label` per item. Less semantic — a list of pills doesn't convey "term: definition" the way `<dl>` does.
- `<span>` pills with no semantic wrapper. Rejects the user's explicit request to keep `<dl>`.

### Decision 2: Route pill = one `<dt>` ("Route") + one `<dd>`

The From and To locations combine into a single route pill: `🚩 Home <icon-circle-arrow-right> 🏁 Work`. Semantically, one `<dt>` (sr-only "Route") + one `<dd>` containing both locations and the arrow icon.

**Why:** the user confirmed "Route" is an equally acceptable single term. One pill tells the trip's story (start → end) better than two separate pills. The `circle-arrow-right` icon sits between the two locations as the directional cue.

**Edge cases:**

- Only start location: `🚩 Home` (no arrow, no end).
- Only end location: `🏁 Work` (no arrow, no start).
- Neither: no route pill rendered.

**Alternatives considered:**

- Two `<dt>`/`<dd>` pairs styled to look like one pill. Rejected — the CSS is fragile (two pairs in one visual container) and the semantics of "From" + "To" don't add value over "Route."

### Decision 3: Pill container = `display: flex; flex-wrap: wrap`

The `<dl>` gets `display: flex; flex-wrap: wrap; gap: 0.5rem`. Pills flow left-to-right and wrap to the next line when they run out of horizontal space. No media queries, no breakpoints — the same layout works on phone (2 pills/row) and desktop (4-5 pills/row).

**Why:** flex-wrap is the simplest responsive layout that "fills horizontal space on both desktop and phones" (the user's requirement). Auto-fit grids (`repeat(auto-fit, minmax(...))`) also work but can produce orphan columns; flex-wrap produces cleaner wrapping.

### Decision 4: Pill styling grounded in Pico variables

```
.trip-detail-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid var(--pico-muted-border-color);
    border-radius: 9999px;
    background-color: var(--pico-form-element-background-color);
    font-size: 0.875rem;
}

.trip-detail-pill [class^="icon-"] {
    color: var(--pico-muted-color);
    font-size: 0.875rem;
}

.trip-detail-pill data + small,
.trip-detail-pill .pill__unit {
    color: var(--pico-muted-color);
    font-size: 0.75rem;
}
```

**Why:** every color and dimension comes from Pico CSS custom properties. The pill shape (`border-radius: 9999px`) is a convention, not a Pico override. The sr-only class is a standard accessibility utility (already used widely in Pico-grounded projects).

**Alternatives considered:**

- Pico's native `<kbd>` or badge styling. Neither is the right shape for a metadata pill.
- Override `--pico-border-radius` globally. Rejected — too broad; pills need full rounding, other elements don't.

### Decision 5: sr-only utility class

Add a small `.sr-only` utility to `app.css`:

```
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

**Why:** the standard screen-reader-only pattern. Needed to hide the `<dt>` labels visually while keeping them semantic. Not provided by Pico CSS out of the box.

## Risks / Trade-offs

- **[Icon-as-label legibility]** A user who doesn't recognize `icon-circle-gauge` as "odometer" loses the text label. → Mitigated: the unit ("km") and the stats-page / trip-form usage of the same icons provide context. The `<dt>` sr-only text still announces the label to screen readers.
- **[Route pill width on long location names]** A location like "Copenhagen Airport, Terminal 3" makes the route pill very wide, potentially filling a full row on mobile. → Acceptable: flex-wrap will move the next pill to a new line. The route pill is naturally the widest pill and that's fine.
- **[Pill count when all details present]** 5 pills (distance, duration, speed, odometer, route) per expanded trip. With 10+ trips/month, expanding several at once could feel busy. → Acceptable: expand/collapse is per-row and on-demand. Users typically expand one at a time.

## Migration Plan

1. Add `.sr-only` and `.trip-detail-pill` / `.trip-detail-pills` classes to `app.css`. Remove or replace the `.trip-snapshot` grid rules.
2. Rewrite the `<dl>` body in `TripRow.tsx`: keep `<dt>`/`<dd>` structure, add `class="trip-detail-pill"` to each `<dd>`, add `class="sr-only"` to each `<dt>`, combine From/To into one route pill with `icon-circle-arrow-right`.
3. Run `bun test` to confirm no regressions (existing tests check for presence of detail content, not layout).
4. Start dev server, expand a trip on desktop and mobile widths, verify pills wrap correctly and the route pill renders with the arrow icon.

## Rollback

Pure-frontend change. `git revert` the commits touching `TripRow.tsx` and `app.css`. No data migration, no API contract change, no cache to clear.
