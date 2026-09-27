# Design

## Context

The stats page (`/stats`) already has a client-side chart pipeline: `StatsChartsFragment` embeds a JSON blob (`<script id="stats-data" type="application/json">`), `StatsPage` loads Chart.js via CDN + SRI, and `public/scripts/stats.mjs` mounts the charts on `DOMContentLoaded` and re-mounts on `htmx:afterSettle` when the period switcher swaps `#stats-region`. The chart region `#stats-charts` is hidden below 768px via CSS (`@media (max-width: 768px) { #stats-charts { display: none; } }`).

The stats view (`StatsView` in `src/backend/presentation/stats/types.ts`) currently carries `series` (bucketed labels + arrays for the line charts) but no per-trip data for the month period. `PeriodTrips` (`src/backend/db/queries/stats/PeriodTrips.ts`) already queries individual trips for the week period but selects only stats fields (no `id`). No single-trip GET endpoint exists today (`src/backend/api/trips.ts` has only `POST /trips`).

See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Reuse the existing chart pipeline pattern (embedded JSON + CDN + mount-on-`htmx:afterSettle`) so the calendar is architecturally consistent with the charts.
- Render the calendar inside `#stats-charts` so it inherits desktop-only hiding for free.
- Reuse the home page `TripRow` pill markup for click-to-detail so the detail is visually identical by construction.
- Map Breezy's indigo palette to Pico semantic vars so a future dark/darker restyle propagates automatically.

**Non-Goals:**
- Dark mode toggle (no roadmap; the override maps to semantic Pico vars so a future darker palette would propagate, but no `data-theme` / `data-color-scheme` switching is built).
- Optimizing the phone mount cost (the script still mounts on phone like `stats.mjs` does — out of scope).
- Year-period calendar (year data is bucketed, not per-trip).

## Decisions

### 1. Per-trip data path: extend `PeriodTrips` + `StatsView`, not a new query

`PeriodTrips` already returns individual trips with `daypart, duration, time, distance, speed, consumption` for the week. Extending it to also SELECT `id` (one column) and running it for the month period too avoids a new query class. `StatsView` gains a `trips` array; `series` stays unchanged for the line charts.

```
  StatsView (extended)
  +---------------------------------------------------+
  | series: { labels, distance, ... }   <- charts     |
  | trips:  { id, time, daypart, consumption }[] (NEW) |
  |         week:  from PeriodTrips (individual)      |
  |         month: from PeriodTrips (individual)      |
  |         year:  [] (empty, no calendar)             |
  +---------------------------------------------------+
```

**Alternative considered:** a new `CalendarTrips` query class. Rejected — `PeriodTrips` already does exactly this; a duplicate query would diverge.

**Cost:** one extra `PeriodTrips` query per month-page load (the month path currently only runs `BucketAggregations("day")`). Both run against the same `trips` table with the same vehicle + time-range filter; the extra query is a single sequential scan.

### 2. FullCalendar load: CDN + SRI + ESM module script

FullCalendar v7 ships as ESM. The `StatsPage` `Scripts` component (which already loads Chart.js UMD + `stats.mjs`) gains a FullCalendar entry. The exact CDN URL and whether it requires `type="module"` vs a classic script needs a quick implementation-time spike against the v7 CDN — the architecture (CDN + SRI + mount script) is the same either way.

The mount script (`public/scripts/calendar.mjs`, mirroring `stats.mjs`) follows the existing destroy/re-render pattern:

```
  calendar.mjs (mirrors stats.mjs)
  +--------------------------------------------------+
  | let cal = null                                    |
  | renderCalendar():                                 |
  |   cal?.destroy()                                  |
  |   read #calendar-data JSON                        |
  |   if empty -> return                               |
  |   new FullCalendar.Calendar(el, {                |
  |     initialView: period===week ? dayGridWeek      |
  |                            : dayGridMonth,        |
  |     headerToolbar: false,  // no toolbar          |
  |     selectable: false,     // no date selection    |
  |     events: trips.map(toFcEvent),                  |
  |     eventClick: (info) => htmx fetch details,      |
  |     eventContent: (arg) => custom HTML,            |
  |   })                                              |
  |   cal.render()                                     |
  +--------------------------------------------------+
  | htmx:afterSettle -> re-render if #stats-calendar  |
  |   swapped or contains calendar data               |
  +--------------------------------------------------+
```

**Alternative considered:** importing FullCalendar as an npm dependency. Rejected — the project loads Chart.js via CDN (no npm), and AGENTS.md approves FullCalendar as a CDN-loaded visualization dep alongside Chart.js.

### 3. Event rendering: `eventContent` hook with tone classes

FullCalendar's `eventContent` render hook returns custom HTML for each event block. The hook builds:

```html
<span class="icon-clock-8" aria-hidden="true"></span>
<span class="cal-tone cal-tone--green cal-tone--bold">14.2</span>
```

The tone class is computed client-side from the trips array + `avgConsumption` (already in `StatsView.stats.avgConsumption.value`). Tone logic:

```
  for each trip:
    if consumption === max(trips.consumption) -> tone--red, tone--bold
    else if consumption === min(trips.consumption) -> tone--green, tone--bold
    else if consumption < avgConsumption       -> tone--green
    else                                       -> tone--amber
```

The tone classes map to Pico color vars via `getColorHex()` from the existing `public/scripts/ui/colors.mjs`:

```
  .cal-tone--green  { color: var(--pico-color-green-500) }
  .cal-tone--amber { color: var(--pico-color-amber-500) }
  .cal-tone--red   { color: var(--pico-color-red-500) }
  .cal-tone--bold  { font-weight: 700 }
```

These use **fixed Pico shades** (not semantic `--pico-primary`), per the decision in explore mode: the consumption tones should stay constant regardless of any neutral-palette restyle, while the calendar's structural colors (borders, background, text) follow Pico semantic vars.

**Alternative considered:** precompute tone server-side and ship it in the JSON. Rejected — keeps the `.mjs` consistent with the chart wrappers (which compute everything client-side from raw series) and avoids coupling the tone thresholds to the backend.

### 4. Breezy indigo palette → Pico semantic vars

The Breezy theme's indigo palette defines ~30 `--fc-breezy-*` custom properties. The override maps them to Pico semantic vars in `public/app.css` (light block only, no dark block since the project has no dark-mode switch):

```
  --fc-breezy-primary:              var(--pico-primary);
  --fc-breezy-primary-over:          var(--pico-primary-hover);
  --fc-breezy-primary-foreground:    var(--pico-primary-inverse);
  --fc-breezy-background:            var(--pico-background-color);
  --fc-breezy-foreground:            var(--pico-color);
  --fc-breezy-muted-foreground:      var(--pico-muted-color);
  --fc-breezy-strong-foreground:     var(--pico-h1-color);
  --fc-breezy-border:                var(--pico-muted-border-color);
  --fc-breezy-strong-border:         var(--pico-secondary-border);
  --fc-breezy-event:                 var(--pico-color-blue-500);
  --fc-breezy-now:                   var(--pico-color-red-500);
  ... (~15-20 lines total)
```

Neutrals use semantic Pico vars (`--pico-background-color`, `--pico-color`, `--pico-muted-border-color`) so they follow any future restyle. The event/now/highlight colors use fixed Pico shades since they're content-specific, not theme-structural.

**Dark mode:** Breezy activates dark mode via `[data-color-scheme=dark]`; Pico uses `[data-theme=dark]`. Since the project has no dark-mode switch, the dark block is dropped entirely. A future "darker styling" that only overrides Pico's neutral vars would propagate through the `--fc-breezy-*` references automatically, as long as the Pico vars stay semantically paired (dark bg + light fg).

### 5. Trip detail endpoint: `GET /stats/trips/:id`

A new route on the stats domain (`src/backend/presentation/stats/stats.tsx`) returns the trip-detail-pills HTML. The handler:

1. Runs a new `FindById` query (`src/backend/db/queries/trips/FindById.ts`) that SELECTs the full `TripRow` by `id`, mapping to `TripSnapshot` (the same type the home page `TripRow` component consumes).
2. Renders the `TripRow` component's `<dl class="trip-detail-pills">` body — either by extracting the body into a shared atom (`TripDetailPills`) or by rendering `TripRow` with a prop that skips the `<summary>`. Extracting the pills into a shared atom is cleaner and follows the `frontend-views` "atom reused across page and fragment" convention.
3. Returns 404 if no trip matches.

```
  GET /stats/trips/:id
       |
       v
  FindById(id) -> TripSnapshot | null
       |
       v
  <TripDetailPills trip={snapshot} />   <- shared atom, same markup as TripRow body
       |
       v
  c.html(...) or 404
```

**Alternative considered:** embed full snapshots in the calendar JSON. Rejected — bloats the month JSON with weather + locations for trips the user may never click; the HTMX fetch is one cheap query per click.

## Ris / Trade-offs

- **[FullCalendar v7 CDN format]** v7 is ESM/Preact-based; the exact CDN URL and script type (`type="module"` vs classic) needs a spike. → Mitigation: the mount architecture is identical either way; if no vanilla CDN bundle exists, use `type="module"` with a static `import` from a CDN like jsDelivr.
- **[Month query cost]** one extra `PeriodTrips` query per month-page load. → Mitigation: both queries share the same table + filter; the extra is a single sequential scan. Acceptable for a personal app.
- **[Breezy theme structural CSS]** the Breezy `theme.css` ships Tailwind-style utility classes (spacing, layout) from CDN. These are opaque but stable. → Mitigation: we only override the palette vars, not the structural classes; if a structural rule conflicts with Pico, scope the override under `#stats-calendar`.
- **[eventContent HTML injection]** FullCalendar's `eventContent` hook injects raw HTML. The trip data is server-owned (not user input), so XSS risk is low, but consumption values are numbers. → Mitigation: format consumption with `toFixed(1)` client-side; no user-supplied strings enter the event HTML.

## Migration Plan

Additive — no migration needed. The change adds a new field to `StatsView`, a new query, a new route, a new script, and CSS overrides. Existing routes, the trip data structure, and the chart pipeline are untouched.

**Rollback:** remove the FullCalendar `<script>` from `StatsPage`, the calendar container + trips blob from `StatsChartsFragment`, the `trips` field from `StatsView`, the `id` column from `PeriodTrips`, the `GET /stats/trips/:id` route + `FindById` query, `calendar.mjs`, and the `--fc-breezy-*` / tone rules from `app.css`.

## Open Questions

- **FullCalendar v7 CDN URL + script type**: needs a quick spike to confirm the exact jsDelivr/unpkg path and whether it's `type="module"`. Does not change the architecture or task breakdown.
- **`TripDetailPills` atom extraction**: whether to extract the `<dl class="trip-detail-pills">` body from `TripRow` into a shared atom (preferred, per `frontend-views` convention) or render `TripRow` with a summary-skip prop. Deferrable to implementation; either satisfies the spec's "same pill markup" requirement.
