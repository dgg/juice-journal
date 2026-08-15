## 1. Delta component

- [ ] 1.1 In `src/frontend/components/Delta.tsx`, add `period?: "week" | "month" | "year"` to the props (default `"month"`)
- [ ] 1.2 Replace the hard-coded `vs last month` string with a period lookup: `"week" → "vs last week"`, `"month" → "vs last month"`, `"year" → "vs last year"`
- [ ] 1.3 Compute the trend icon from the sign of `value`: `value > 0 → "trending-up"`, `value < 0 → "trending-down"`, `value === 0 → "trending-up-down"`
- [ ] 1.4 Render `<span class={`icon-${iconName}`} aria-hidden="true"></span>` before the signed value text, inside the existing `<p class="delta ...">` element
- [ ] 1.5 Keep the existing `+` sign for positive values, no sign for zero/negative, and the `positive` / `negative` / neutral color class on the `<p>` — icon inherits `currentColor`
- [ ] 1.6 When `value === null`, keep the early `return null` (no icon, no suffix)

## 2. StatCard atom (home page path)

- [ ] 2.1 In `src/frontend/components/StatCard.tsx`, add `period?: "week" | "month" | "year"` to the `Stat` interface
- [ ] 2.2 Forward `period={stat.period}` to `<Delta value={stat.delta} unit={stat.deltaUnit || stat.unit} period={stat.period} />`
- [ ] 2.3 Leave `StatsGrid` callites unchanged — `stat.period` is undefined, so `Delta` defaults to `"month"` (preserves today's home-page suffix byte-for-byte)

## 3. StatsChartsFragment StatCard (stats page path)

- [ ] 3.1 In `src/frontend/fragments/StatsChartsFragment.tsx`, add `period: "week" | "month" | "year"` to the local `StatCard` props
- [ ] 3.2 Forward `period={period}` to `<Delta value={delta} unit={unit} period={period} />` inside the local `StatCard`
- [ ] 3.3 At every `StatCard` call site in the fragment, pass `period={data.period}` (the `StatsView` already carries `data.period`)
- [ ] 3.4 Verify the period-icon and per-stat-icon spans do not collide — the per-stat icon stays on `.stat-card__label`, the trend icon stays inside `.delta`

## 4. Styling

- [ ] 4.1 In `public/app.css`, add a `.delta` rule that lays out icon + text: `display: inline-flex; align-items: center; gap: 0.3rem` (or apply flex on the existing `<p class="delta">` without breaking the existing `positive` / `negative` color classes)
- [ ] 4.2 Add `.delta [class^="icon-"]` sizing: font-size matching the existing `.delta` text size so the icon does not shift the value baseline
- [ ] 4.3 Verify visually that the `+50 km vs last month` text and the `trending-up` glyph are vertically centered and the icon inherits the `positive` / `negative` color via `currentColor`
- [ ] 4.4 No inline `<style>` blocks; all rules in `public/app.css` per the `frontend-views` stylesheet contract

## 5. Tests

- [ ] 5.1 Add a `Delta` unit test (or render snapshot) covering `value > 0`: renders `icon-trending-up`, `+` sign, `positive` class, and `vs last month` by default
- [ ] 5.2 Add a `Delta` test covering `value < 0`: renders `icon-trending-down`, no `+`, `negative` class, and `vs last <period>` matching the passed `period`
- [ ] 5.3 Add a `Delta` test covering `value === 0`: renders `icon-trending-up-down`, no sign, neutral class (no `positive` / `negative`)
- [ ] 5.4 Add a `Delta` test covering `value === null`: renders nothing (early return)
- [ ] 5.5 Add a `Delta` test asserting the suffix string changes with `period`: `"week" → "vs last week"`, `"year" → "vs last year"`, `"month" → "vs last month"`
- [ ] 5.6 In the stats-page render tests, assert the delta suffix matches `data.period` for each of `week`, `month`, `year` (regression for the "always says month" bug)
- [ ] 5.7 Run `bun test` — full suite green
- [ ] 5.8 Run lint/typecheck per repo defaults
- [ ] 5.9 Run `prettier --check` on edited files

## 6. Manual verification

- [ ] 6.1 On `/` (home page): confirm delta indicators show `trending-up` / `trending-down` / `trending-up-down` icons colored to match, suffix reads `vs last month`
- [ ] 6.2 On `/stats?period=week`: confirm suffix reads `vs last week` and the trend icon matches the sign of the delta
- [ ] 6.3 On `/stats?period=year`: confirm suffix reads `vs last year` and the trend icon matches the sign of the delta
- [ ] 6.4 On `/stats?period=month`: confirm suffix reads `vs last month` (no regression)
- [ ] 6.5 Confirm the `trending-up-down` glyph actually renders from `lucide-static@1.31.0`; if missing, fall back to no icon for the equal case and keep the directional icons
