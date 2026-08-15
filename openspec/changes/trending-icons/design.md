## Context

The delta indicator today is a single shared component, `src/frontend/components/Delta.tsx`, rendered by two paths:

- **Home page:** `HomePage` → `StatsGrid` (`src/frontend/components/StatCard.tsx`) → `StatCard` → `<Delta value={...} unit={...} />`. The home page is implicitly month-scoped, so the hard-coded `vs last month` suffix in `Delta.tsx:11` happens to be correct here.
- **Stats page:** `StatsPage` → `StatsChartsFragment` (`src/frontend/fragments/StatsChartsFragment.tsx`) → a local `StatCard` (defined in the same file, separate from the `StatCard` atom in `components/`) → `<Delta value={delta} unit={unit} />`. The `StatsView` typed prop on the fragment already carries `data.period: "week" | "month" | "year"`, but it is not forwarded to `Delta`, so every period renders `vs last month` — the bug to fix.

Both `StatCard` variants already render their per-stat icon via the project's icon system (`<span class={`icon-${icon}`} aria-hidden="true"></span>`), and `Layout.tsx` loads `lucide-static@1.31.0` font CSS. So adding the trend icon is purely a render-time change in `Delta.tsx`; no new dependency, no client JS.

See `proposal.md - Why` for the motivation and `specs/trip-stats/spec.md` / `specs/home-page-ssr/spec.md` for the behavioral contract.

## Goals / Non-Goals

**Goals:**
- Make the delta suffix period-aware so the stats page reads the correct period name for week and year, not always "month".
- Render a trend-direction icon (`trending-up` / `trending-down` / `trending-up-down`) inline in the delta indicator, driven by the sign of `value`.
- Keep the existing color coding and `+` sign as the source of truth for direction; the icon is additive.
- Avoid touching backend handlers, route shapes, or query objects — the period is already present on every render path that produces a delta.

**Non-Goals:**
- Unifying the two `StatCard` definitions (one in `components/StatCard.tsx`, one local to `StatsChartsFragment.tsx`). They diverge in shape (the fragment variant takes `value`/`prev`/`unit`/`icon`; the atom takes a `Stat` object) and merging them is out of scope for an icon/label fix.
- Changing how deltas are computed. The `value - prev` math stays in the callers; `Delta` keeps receiving a signed `value`.
- Adding client-side behavior. The icon is a CSS font glyph rendered server-side; no JS, no HTMX wiring changes.

## Decisions

### D1. `period` prop on `Delta`, default `"month"`

Add `period?: "week" | "month" | "year"` to `Delta`'s props, defaulting to `"month"`. The suffix becomes a small lookup:

```
vs last week | vs last month | vs last year
```

**Why default `"month"`:** the home page callsites in `StatsGrid` do not carry an explicit period — they are month-scoped by construction. A `"month"` default preserves today's home-page output byte-for-byte without forcing `StatsGrid` to thread a period it does not have. The stats-page callites *do* have the period and will pass it explicitly, so the default never papers over missing data on the stats page.

**Alternative considered:** make `period` required and thread `"month"` from `StatsGrid`. Rejected — it adds churn to the home-page render path for no behavioral gain and risks a future caller forgetting the prop and getting a compile error instead of a sensible default.

### D2. Trend icon chosen by sign, rendered as a span

Inside `Delta`, after the early `null` return:

```
const iconName = value > 0 ? "trending-up" : value < 0 ? "trending-down" : "trending-up-down"
```

Rendered as `<span class={`icon-${iconName}`} aria-hidden="true"></span>` before the signed value text. `aria-hidden` matches the existing icon pattern across the codebase (`TripRow`, `StatCard`, `StickyCta`) — the icon is decorative because the color and sign already convey direction.

**Alternative considered:** picking the icon by color class instead of by raw sign. Rejected — color is a styling concern and the sign is the semantic input; coupling icon choice to color would make a future theme change accidentally flip the icon.

### D3. Equal-value branch renders `trending-up-down` with no sign

When `value === 0`, today's code already drops the `+` (sign is only added when `value > 0`) and produces the neutral class. The new branch keeps that: no `+`/`-`, neutral color, `trending-up-down` icon. The formatted value is `0.0` (from `value.toFixed(1)`), unchanged.

### D4. Thread `period` through both `StatCard` variants

- **Atom `StatCard` (`components/StatCard.tsx`):** add optional `period?: "week" | "month" | "year"` to the `Stat` interface and forward it to `<Delta ... period={stat.period} />`. Default behavior is preserved when `stat.period` is undefined (Delta defaults to `"month"`). `StatsGrid` does not need to set `period` — the default gives `vs last month`, which is correct for the home page.
- **Fragment `StatCard` (`StatsChartsFragment.tsx`):** add `period: "week" | "month" | "year"` to its props and forward it to `<Delta value={delta} unit={unit} period={period} />`. The fragment's `StatCard` callsites already have `data.period` in scope; pass it down.

**Why touch both:** the two `StatCard` variants both call `<Delta>` directly. Only forwarding through one would leave the other path on the hard-coded suffix. The atom is used by the home page (month-scoped) and the fragment variant by the stats page (period-scoped), so both need the prop, but only the fragment variant needs the caller to actually supply a value.

### D5. CSS in `public/app.css`, scoped to `.delta`

Add a rule scoping to `.delta [class^="icon-"]` that lays out icon + text with `display: inline-flex; align-items: center; gap: 0.3rem` (or apply the layout on the `.delta` element itself if it is not already flex). Size the icon to match the delta text (the existing `.delta` font-size). No inline `<style>` per the `frontend-views` stylesheet contract.

The `.delta` element is currently a `<p class="delta ...">` with plain text content. Switching it to `display: inline-flex` (or `flex` with `align-items: center`) is the minimal change; the existing `positive` / `negative` color classes are kept on the `<p>` and the icon inherits `currentColor`, so the icon automatically matches the delta color. Verify the icon does not shift the baseline of the value text.

## Risks / Trade-offs

- **[Risk] Two `StatCard` definitions could drift further.** → Mitigation: this change touches both in the same way (forward a `period` prop), so it does not widen the gap. A future unification is still possible; flagged as a non-goal, not blocked.
- **[Risk] Default `"month"` could mask a future caller that forgets to pass the period on a non-month page.** → Mitigation: the only render path that produces a non-month delta is the stats page, which already has `data.period` in scope and is being wired explicitly in this change. A new page would need its own `StatCard` usage; the default makes that page render sensibly (month) rather than crash, and the spec for that page would catch the wrong-suffix behavior.
- **[Risk] Icon baseline shifts the value text.** → Mitigation: CSS uses `align-items: center` on the `.delta` flex container and sizes the icon to the existing text size; verify visually against the existing `icon-` rules in `app.css` (e.g. `.badge [class^="icon-"]`) which already solve this.
- **[Trade-off] `trending-up-down` for the equal case is a Lucide icon name assumption.** It exists in `lucide-static@1.31.0`; if the icon does not render, fall back to no icon for the equal case and keep `trending-up` / `trending-down` for the directional cases. Verify in the browser during implementation.

## Migration Plan

Render-only change; no DB migration, no API change, no deployment coordination.

1. Update `Delta.tsx`, both `StatCard` files, and `public/app.css`.
2. Add/extend tests in `src/frontend/__tests__/` for the three icon branches, the three suffix strings, and the stats-page period-forwarding behavior.
3. Run `bun test` and the repo lint/typecheck.
4. Manually verify on `/` (month, suffix unchanged, icons appear) and `/stats?period=week` / `?period=year` (suffix and icons change with period).

Rollback: revert the four source files and the `.delta` CSS block. The optional `period` prop can stay on `Delta` and the `Stat` interface so callers keep type-checking; no migration needed.
