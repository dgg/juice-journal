## Context

The `StickyCta` component (`src/frontend/components/StickyCta.tsx`) already types an optional `icon?: string` on each `Action` but its render path only outputs `a.label`. The project renders icons via the `lucide-static@1.31.0` font loaded in `src/frontend/Layout.tsx`, using the established pattern `<span class="icon-<name>" aria-hidden="true"></span>` (see `TripRow.tsx` `icon-clock-8`/`icon-clock-4`, `StatsChartsFragment.tsx` `icon-move-left`/`icon-move-right`). Icon size is controlled by `font-size` on the icon class (see `.daypart-indicator .icon-sun` in `public/app.css`). No backend, route, or data model is involved.

## Goals / Non-Goals

**Goals:**
- Render an optional icon inline before the label in each `StickyCta` action anchor.
- Keep the icon vertically centered and sized to match the button text, without shifting the label baseline or breaking the Pico `role="button"` layout.
- Reuse the existing `lucide-static` font-icon pattern and the existing `icon-<name>` class convention — no new dependency.

**Non-Goals:**
- Adding icons to the trip form page's `.sticky-submit` `Back` anchor.
- Changing which icons callers pass (callers decide icon names; this change only enables rendering).
- Validating icon names against the lucide set (an unknown name renders a blank glyph, same as any other lucide font usage in the app).

## Decisions

### 1. Render the icon as a `lucide-static` font span, not an inline SVG or emoji

Use `<span class={`icon-${a.icon}`} aria-hidden="true"></span>` before the label, matching `TripRow` and `StatsChartsFragment`. The lucide font is already loaded globally in `Layout.tsx`.

**Alternatives considered:**
- Inline SVG per icon: more markup, no font load needed, but diverges from the established in-app pattern and adds per-icon code.
- Emoji: inconsistent across platforms, no color control.

### 2. Place the icon before the label, separated by a small gap

Order: `<span class="icon-..."> <label>`. A trailing gap (not a leading one) keeps LTR reading order natural. Use a flex row on the anchor so icon and label center together.

**Alternatives considered:**
- Icon after label: less conventional for primary actions; rejected for consistency with common CTA affordances.

### 3. Size and align via CSS scoped to `.sticky-cta`, in `public/app.css`

Add a rule targeting `.sticky-cta a[role="button"]` to lay out icon + label with flexbox (`display:inline-flex; align-items:center; gap:.4rem`) and size the icon with `font-size` matching the button text (`1.05rem`, the size already set on `.sticky-cta a[role="button"]`). This follows the AGENTS.md styling order: no Pico class exists for this, so a scoped custom rule in `public/app.css` is the last-resort path.

**Alternatives considered:**
- Inline `<style>`: forbidden by AGENTS.md.
- A new component-level CSS file: the project keeps all custom CSS in `public/app.css`.

### 4. Keep the `icon` property optional; omit the span entirely when absent

Conditional render: `{a.icon && <span ... />}`. Anchors without `icon` render exactly as today, so `HomePage`/`StatsPage` callers passing no icon are unaffected.

## Risks / Trade-offs

- **[Icon name typo renders blank]** → Mitigation: callers own icon names; an unknown lucide name is a no-op glyph, consistent with the rest of the app. No validation added (out of scope).
- **[Flex on the anchor could alter Pico button internals]** → Mitigation: scope the rule tightly to `.sticky-cta a[role="button"]` and verify the button still fills its grid cell (`width:100%` preserved). Add a visual check to the test.
- **[Vertical alignment drift across Pico themes]** → Mitigation: use `align-items:center` rather than `vertical-align` so the icon centers regardless of line-box metrics.
