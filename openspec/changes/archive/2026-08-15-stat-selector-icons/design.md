## Context

The stats page renders two segmented button groups in `StatsChartsFragment.tsx`: `.period-switcher` (week/month/year) and, only for the year period, `.year-granularity` (Month/Week). Both groups are flex containers whose buttons use `flex:1` and shared border-radius to form a segmented control (see `public/app.css` `.period-switcher button, .year-granularity button`). Buttons currently render a text label only. The project renders icons via the `lucide-static@1.31.0` font loaded in `Layout.tsx` using `<span class="icon-<name>" aria-hidden="true"></span>` (established by `TripRow`, `StickyCta`). No backend, route, query, or data model is involved.

## Goals / Non-Goals

**Goals:**
- Render a `lucide-static` calendar icon inline before the label in each period-switcher button: `week` → `calendar-1`, `month` → `calendar-days`, `year` → `calendar`.
- Render matching icons in the year-granularity toggle buttons (`month` → `calendar-days`, `week` → `calendar-1`) for visual consistency.
- Keep the icon vertically centered and sized to match the button text, without breaking the segmented-button layout.

**Non-Goals:**
- Changing period semantics, HTMX swap behavior, or query parameters.
- Adding icons to stat cards, the period-label, or navigation arrows.
- Validating icon names against the lucide set (an unknown name renders a blank glyph, same as elsewhere).

## Decisions

### 1. Render the icon as a `lucide-static` font span before the label

Use `<span class={`icon-${iconFor(p)}`} aria-hidden="true"></span>` before the existing label text, matching the in-app pattern. A small helper maps period/granularity value → icon name (`week`→`calendar-1`, `month`→`calendar-days`, `year`→`calendar`) so both button groups share one mapping.

**Alternatives considered:**
- Inline SVG per button: diverges from the established font-icon pattern and adds per-icon markup.
- Emoji: inconsistent across platforms, no color control.

### 2. Center icon + label with flexbox on the button, scoped to the two groups

Add `display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem` to `.period-switcher button, .year-granularity button`. The buttons already use `flex:1` within their parent flex row; making each button itself a flex container centers its icon+label content without affecting the outer segmented layout.

**Alternatives considered:**
- `vertical-align` on the icon span: brittle across line-box metrics.
- A wrapper span around icon+label: extra markup; flex on the button is simpler.

### 3. Size the icon to match the button text via a scoped `[class^="icon-"]` rule

Add `.period-switcher button [class^="icon-"], .year-granularity button [class^="icon-"] { font-size: <button text size> }` so the glyph matches the label. Follows the AGENTS.md styling order: no Pico class exists for this, so a scoped custom rule in `public/app.css` is the last-resort path.

**Alternatives considered:**
- Inline `<style>`: forbidden by AGENTS.md.

## Risks / Trade-offs

- **[Flex on the button could disturb the segmented border-radius]** → Mitigation: keep `flex:1` and the existing `:first-child`/`:last-child` border-radius rules; only add inner flex properties. Verify visually that the segmented shape is preserved.
- **[Icon shifts the label baseline]** → Mitigation: use `align-items:center` so the icon centers regardless of line-box metrics; add a visual check to the test.
- **[Unknown icon name renders blank]** → Mitigation: callers own icon names via the helper; an unknown lucide name is a no-op glyph, consistent with the rest of the app.

## Migration Plan

Add the icon span to both button groups in `StatsChartsFragment.tsx` and the scoped CSS in `public/app.css`. Rollback is a revert of those two files — no data migration, no API change.
