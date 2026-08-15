## Context

The trip form's daypart segmented control (`.daypart-selector` in `public/app.css`) currently styles both selected radio options with Pico's primary color via a single `.daypart-selector input:checked + span` rule. The trip listing already differentiates dayparts by hue (`.daypart-indicator.morning` → amber, `.daypart-indicator.afternoon` → indigo). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Make the selected daypart option carry the matching hue family from the listing.
- Keep the change CSS-only — no JSX, handler, or test changes.

**Non-Goals:**
- Changing the unselected state, the control layout, or the icon set.
- Introducing new CSS custom properties or design tokens.
- Saturated/shade adjustments (deferred — start with the same `-100`/`-200` shades as the listing, adjust later if too washed out).

## Decisions

### Decision: Attribute selectors on `input[value]` per option

Target each checked radio by its `value` attribute rather than adding classes to the JSX:

```css
.daypart-selector input[value="morning"]:checked + span   /* amber */
.daypart-selector input[value="afternoon"]:checked + span /* indigo */
```

**Rationale:** the radios already carry `value="morning"` / `value="afternoon"` in `TripFormPage.tsx`. No JSX change needed. Specificity `(0,3,1)` beats the generic `input:checked + span` at `(0,2,1)` regardless of source order — no `!important`.

**Alternative considered:** adding a `data-daypart` attribute or class to each `<label>` and targeting by that. Rejected — more markup churn for the same result; `value` is already there.

### Decision: Selected border steps up one shade (Option 2)

The selected option's border uses the `-200` shade (amber-200 / indigo-200) while the background uses `-100`. This gives the filled button a crisp outline edge against the unselected neighbor, which keeps the `-100` muted-border-color of the unselected side from blending.

**Alternative considered (Option 1):** border matches background (`-100`). Rejected — seamless fill relies on background contrast alone; the edge reads softer. Can revisit if the outline looks too heavy.

### Decision: Keep the generic `:checked + span` rule as fallback

Leave the existing `.daypart-selector input:checked + span` rule in place. The two attribute-selector rules override it for morning/afternoon; if a future third daypart were added without a matching rule, the generic would apply. Harmless, and reduces blast radius (no deletion to revert).

## Risks / Trade-offs

- **[Washed-out appearance]** The `-100`/`-200` pastel shades may read as too subtle against the white unselected background, making "selected" less obvious than the current bold primary fill. → Mitigation: agreed to try the pastel first and adjust to `-500`-tier shades if it looks too washed out. The change is two CSS rules; bumping shades is a one-line edit each.
- **[Color contrast / accessibility]** Pastel background with a `-200` icon color may have low contrast for the icon glyph. → Mitigation: the icon is decorative (`aria-hidden="true"`); the radio's `value` is conveyed semantically. Still worth a visual check during implementation.
