# Home Page — SSR (HTMX + Pico)

SSR home page for juice-journal. Server renders current-calendar-month stats + trip list. No SPA, no API consumed by the UI.

## Scope

In scope:

- New Hono route `GET /` rendering HTML.
- Server-side stat aggregation from DB (current calendar month, display tz).
- Trip list (current month, newest first) with tap-to-expand rows.
- Empty state (zero trips).
- Sticky full-width "Log new trip" CTA linking to `/trips/new`.

Out of scope (separate changes):

- `/trips/new` input form page (CTA target only here).
- `avg_consumption_kwh_100km` NOT NULL migration + backfill.
- Distance pro-rata MoM delta (city-pair comparison future).
- Chart.js trend chart in stats rail.
- Multi-vehicle selection UI.
- Weather/odometer analytics.

## Decisions

1. **SSR, no UI API.** `GET /` handler queries DB directly and renders HTML. `GET /api/trips` untouched (tooling only).
2. **Month scope = current calendar month** in display tz, not rolling 30 days. Reuse `resolveDisplayTz` + `currentMonthBoundsUtc` (`src/utils/dates.ts`).
3. **Stats (computed server-side):**
    - HERO: `AVG(avg_consumption_kwh_100km)` (kWh/100km) + MoM delta vs prev calendar month.
    - Secondary: `AVG(duration_min)` (min) + MoM delta; `SUM(distance_km)` (km) plain, **no delta v1** (cumulative metric, misleading mid-month).
    - `avg_speed_kmh` excluded from hero/strip — lives only in expanded trip row.
4. **MoM delta source:** separate query bounded to previous calendar month (same tz bounds logic). If prev month has zero non-null rows → hide that delta. Averages are per-trip so fair any day of month.
5. **NULL consumption handling:** SQL `AVG()` skips NULLs automatically. If zero non-null rows → render `—`. No schema change in this plan.
6. **Displayed vehicle = latest trip's `vehicle_id`** (most recent `end_time`). Header shows `vehicle.description`. All stats + list scoped to that vehicle. No selection UI v1. Future `?vehicle=<id>` override parked.
7. **CTA "Log new trip"** = sticky full-width. Phone: above stats. Desktop: top of left (trip list) column. Links to `/trips/new`.
8. **Trip row (collapsed):** date, start–end time, daypart icon+color, consumption. Tap expands detail (no lazy load, no JS):
    - Detail fields: `distance_km`, `avg_speed_kmh`, `odometer_km`, start/end location `label` (join to `locations`), `duration_min`.
9. **Tap-expand mechanism:** pure `<details>`/`<summary>` HTML. Data already in DOM. No HTMX, no client JS.
10. **Daypart encoding:** icon + color both. morning = ☀ amber; afternoon = 🌙 indigo. Both for colorblind a11y (color alone insufficient).
11. **Empty state (option A):** zero trips → hero `—`, strip `0 km · — min`, list replaced by message "No trips yet — log your first commute ↑" pointing at CTA. Deltas hidden (no prev data either). Keeps layout stable across empty→populated.
12. **Layout:**
    - Phone: stacked — header, sticky CTA, hero, secondary strip, trip list.
    - Desktop (D2): list LEFT (CTA on top), stats RIGHT (sticky). Stats uncompressed.
13. **Stack constraint:** HTMX + Pico CSS only. Semantic HTML. No custom CSS, no client framework. Chart.js not used in this plan.

## Data flow

```
GET /
  → resolve display tz (resolveDisplayTz, DISPLAY_TZ env fallback Europe/Copenhagen)
  → currentMonthBoundsUtc(tz) → {startUtc, endUtc}
  → prevMonthBoundsUtc(tz)    → {startUtc, endUtc}   [NEW helper, mirror currentMonthBoundsUtc]
  → query latest trip's vehicle_id (MAX(end_time)) → displayed vehicle + description
  → query current-month trips for that vehicle (ORDER BY end_time DESC)
  → query current-month aggregates (AVG consumption, AVG duration, SUM distance) for that vehicle
  → query prev-month aggregates (AVG consumption, AVG duration) for that vehicle
  → join locations (label) for trip rows
  → render template (Pico) → HTML
```

All queries scoped to displayed `vehicle_id`. tz bounds reused from existing helpers; add `prevMonthBoundsUtc` sibling.

## Layout wireframes

### Phone

```
┌─────────────────────┐
│ Aug 2026 · 🚗 Leaf  │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │  ✚  Log new trip │ │  sticky full-width
│ └─────────────────┘ │
├─────────────────────┤
│   14.2 kWh/100km    │  HERO
│   ▼ 2.1 vs Jul      │  MoM delta
│ ─────────────────── │
│   24 min ▲ 1.2 vs Jul│  avg duration + delta
│   612 km            │  distance, no delta
├─────────────────────┤
│ Trips · 40          │
│ ┌─────────────────┐ │
│ │ Aug 1 17:42–18:10│ │  <summary>
│ │ 🌙 PM  13.8 kWh  │ │
│ │  ▸ 32km 70km/h   │ │  <details> (expand)
│ └─────────────────┘ │
│ ...                 │
└─────────────────────┘
```

### Desktop D2

```
┌──────────────────────────────────────────────────────┐
│ Aug 2026 · 🚗 Leaf                                   │
├────────────────────────────┬─────────────────────────┤
│ ┌────────────────────────┐│  14.2 kWh/100km         │
│ │  ✚  Log new trip       ││  ▼ 2.1 vs Jul           │
│ └────────────────────────┘│ ─────────────────────── │
│ Trips · 40                │  24 min   ▲ 1.2 vs Jul  │
│ ┌────────────────────────┐│  612 km                 │
│ │ Aug 1 17:42–18:10      ││  (future: ≈ CPH↔ODE)    │
│ │ 🌙 PM   13.8 kWh       ││                         │
│ │  ▸ 32km 70km/h         ││                         │
│ └────────────────────────┘│                         │
│ ...                       │                         │
└────────────────────────────┴─────────────────────────┘
```

## Tasks

1. Add `prevMonthBoundsUtc(zone, now?)` to `src/utils/dates.ts` (mirror `currentMonthBoundsUtc`, subtract 1 month). Add unit test in `dates.test.ts`.
2. Add home route `GET /` in `src/backend/index.ts` wired to new home handler.
3. Create `src/frontend/` home template (Pico HTML). New file(s) per AGENTS.md `src/frontend/` convention. Render header, CTA, hero, strip, list, empty state, trip rows with `<details>`.
4. Add home handler in new `src/backend/home.ts` (or extend `handlers.ts`): tz resolution, displayed-vehicle resolution, current+prev month queries, aggregates, location join, template render.
5. Daypart → icon+color mapping helper (morning ☀ amber / afternoon 🌙 indigo) — inline in template or small util.
6. Number/date formatting (Luxon for tz-aware display of start/end time; consumption/distance/duration formatting).
7. Tests for home handler: empty state, populated month, NULL-consumption skip, prev-month delta hidden when no prev data, displayed-vehicle = latest trip.
8. Verify `bun test` passes (existing handler tests unaffected). Run `docker build .` per AGENTS.md.

## Risks / notes

- **Display tz fallback** `Europe/Copenhagen` via `DISPLAY_TZ` env — existing behavior, unchanged.
- **NULL consumption rows** — `AVG()` skips; guard zero-non-null → `—`. No migration here.
- **Prev-month delta** — extra query; ensure tz-bounded to prev calendar month. Hide delta if prev month empty for that vehicle.
- **Displayed vehicle** — `MAX(end_time)` over all trips (not just current month) so badge stable if current month empty but history exists. If no trips at all → empty state, no badge.
- **Location join** optional per row (rows may have null location_ids). Left join, render label or omit.
- **`/trips/new`** not built here — CTA links to it; route may 404 until separate change. Consider placeholder route returning "coming soon" to avoid broken link, or defer CTA href. Recommend: wire href to `/trips/new`, build page in next change.

## Open questions for implementer

- Exact detail-field set in expanded row — confirm `distance_km`, `avg_speed_kmh`, `odometer_km`, location labels, `duration_min` suffice. Weather JSONB omitted from row (null currently).
- Whether to render a placeholder stats-rail note for future city-pair comparison or leave blank now. Recommend: leave blank now, add when feature lands.
- `/trips/new` href: live link (may 404) vs stub. Recommend live link, build page next.

## Validation

- `bun test` green (existing + new home handler + dates tests).
- `docker build .` succeeds.
- Manual: seed trips → load `/`, verify stats + list + deltas + expand. Empty DB → empty state. Phone + desktop widths responsive.
- HTML semantic, Pico-only, no custom CSS added.
