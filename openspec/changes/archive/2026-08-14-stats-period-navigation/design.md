## Context

`computeStatsView` and `periodBoundsUtc` already accept a `now: DateTime` parameter — the current handlers just hardcode `DateTime.now()`. The entire period-bounds and previous-period-delta machinery is already anchor-aware; it was never wired to anything but "now." This change is primarily about passing a user-selected anchor through the existing pipeline and rendering the navigation control that produces it.

## Goals / Non-Goals

**Goals:**

- Let users view any past period (week, month, year) — not just the current one.
- Unify picker and stepper into one `date` query parameter (single source of truth).
- Precompute adjacent-period dates server-side so HTMX swaps need zero client JS.
- Reuse `computeStatsView`, `periodBoundsUtc`, and `statsQueries` without modification.

**Non-Goals:**

- Free-text date entry or custom date ranges (only period-aligned navigation).
- Client-side state management (all state lives in the URL + server-rendered hrefs).
- Changing the chart rendering, stat aggregation, or bucketing logic.
- Multi-vehicle selection (still pinned to the most recent trip's vehicle).

## Decisions

### 1. Single `date` param instead of separate `offset`

**Choice:** One `date` query parameter carries the anchor. The stepper rewrites the date to the adjacent period.

**Why:** `date` is the honest expression — it names the period, not a distance from now. Bookmarkable, unambiguous, and the picker already produces date values natively. An offset param would require the server to convert offset → date for the picker, and the picker → offset for the stepper — two conversions for no benefit.

**Alternative:** `offset` integer param. Simpler arithmetic but doubles the translation layer (offset ↔ date) and is less meaningful in a URL.

### 2. Anchor resolution: `date` param → `DateTime`, fallback to `now`

**Choice:** A small parse function in `stats.tsx` reads `date`, validates it against the period's expected format, and produces a `DateTime` anchor. If absent or empty, anchor = `DateTime.now()`.

```
period=week  → date=2026-W33  → DateTime.fromISO("2026-W33", { zone: displayTz })
period=month → date=2026-07   → DateTime.fromISO("2026-07", { zone: displayTz })
period=year  → date=2026      → DateTime.fromISO("2026-01-01", { zone: displayTz })
no date      → DateTime.now()
```

Invalid/unparseable dates return a 400 (delegates to existing problem-details handler).

### 3. Adjacent-period precomputation in `computeStatsView`

**Choice:** Extend `StatsView` with `prevDate` and `nextDate` fields (ISO strings or null). `computeStatsView` computes them from the anchor:

```
prevDate = anchor.minus({ [periodUnit]: 1 })  → formatted to period's date format
nextDate = anchor.plus({ [periodUnit]: 1 })   → formatted, or null if at/after now
```

The fragment renders these into ◀/▶ button hrefs. After every swap, the buttons are correct for the new anchor — no client JS, no state to track.

**Why server-side:** The existing period switcher already uses server-rendered HTMX hrefs. This follows the same pattern. Client-side date math would require shipping JS, violating the stack constraint.

### 4. Year picker as `<select>` with server-rendered options

**Choice:** For the year period, render a `<select>` with year options. The server determines the range (e.g., earliest trip year → current year) and marks the anchor year as selected.

**Why:** There is no native `<input type="year">`. A `<select>` is consistent with mobile and desktop, needs no JS, and the server already knows the valid year range from trip data.

**Alternative:** `<input type="number">` — typeable but unguided, and mobile shows a numeric keyboard without validation.

### 5. Picker `change` event triggers HTMX via `hx-trigger`

**Choice:** The picker carries `hx-trigger="change"` with `hx-vals='{"date": this.value}'` (or `hx-include`). On mobile, native pickers only fire `change` after the user commits (taps Set), so premature renders are not a concern. Clearing the picker fires `change` with an empty value, which the server treats as "no date" → anchor = now.

### 6. ▶ disabled via `disabled` attribute, not a conditional render

**Choice:** When `nextDate` is null (anchor period ≥ current period), render the ▶ button with the `disabled` attribute. The button is always present in the DOM — just non-interactive. This keeps the control layout stable across navigations.

## Risks / Trade-offs

- **[ISO week format parsing]** Luxon's `DateTime.fromISO("2026-W33")` produces a Monday-based week. If the display timezone shifts the week boundary, the bounds may be off by a day. → Mitigation: always set the zone explicitly when parsing, and verify against `currentWeekBoundsUtc` which already uses `startOf("week")` (ISO Monday).

- **[Year `<select>` range]** The server needs to know the earliest trip year to populate options. An extra query (`MIN(end_time)`) is needed, or the range can be hardcoded (e.g., 2020–current year). → Mitigation: use `findLatestTripVehicleId` pattern — add a lightweight `findEarliestTripYear` query, or just compute from existing data already fetched.

- **[Period switch resets date context]** Switching from month to week with `date=2026-07` needs to resolve to the ISO week containing a day in July 2026. This is a format conversion (`2026-07` → pick a day → find containing week). → Mitigation: parse the date as "first day of the period" and let `periodBoundsUtc` find the containing period bounds. `DateTime.fromISO("2026-07").startOf("week")` handles this.

- **[Clear behavior on desktop]** Desktop `<input type="month">` doesn't have a "Clear" button in all browsers. The empty-value `change` path is mobile-specific. → Mitigation: the server already handles missing `date` gracefully (defaults to now). No special desktop handling needed.
