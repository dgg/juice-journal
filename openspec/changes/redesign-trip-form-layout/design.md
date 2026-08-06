## Context

The trip form (`src/frontend/pages/TripFormPage.tsx`) currently renders as ~7 separate `<div class="grid">` blocks, each its own row. Pico v2.1.1's `.grid` collapses to one column below 768px, so on phones every field stacks — producing a tall form where the seven important fields (date, start, end, daypart, distance, speed, consumption, odometer) cannot all be seen at once, and the in-flow Save button sits below the fold with no sticky anchor. The server already derives `duration_min` from `end_time - start_time` (see `trip-input-form` spec, "Duration derived server-side"), so the form's read-only duration `<output>` and hidden `duration_min` input are redundant. A `StickyCta` component exists for the back link but is a separate, non-form element placed after the form.

## Goals / Non-Goals

**Goals:**
- All seven car-screen fields visible above the fold on a 390px-wide phone viewport.
- Sticky Save + Back bar visible at all scroll positions.
- Preserve the existing server-side duration derivation; remove the form-side duration artifacts.
- Stay within Pico CSS + `public/app.css` (no new dependencies, no client JS).

**Non-Goals:**
- Changing the server-side trip input schema or handler logic.
- Adding client-side duration display (deferred — see Open Questions).
- Redesigning other pages (home, trip list) — this change is scoped to the trip form.
- Touching the daypart auto-derivation or location preset logic at render time.

## Decisions

### Decision 1: Override Pico's mobile grid collapse via a scoped `.trip-form` class

Pico's `.grid` uses `grid-template-columns: repeat(auto-fit, minmax(0%, 1fr))` above 768px and collapses to one column below. To force two columns on phones, override `grid-template-columns: 1fr 1fr` on `.trip-form .grid` in `public/app.css`. A `.grid--full` modifier exempts full-width rows (date is NOT exempt — date shares with daypart; only vehicle is exempt).

**Alternatives considered:**
- Pico's `role="group"` (doesn't collapse on mobile, but is intended for button/input groups, not full form rows; lacks grid gap semantics).
- Inline `style` attributes (rejected — AGENTS.md forbids inline styles).
- A new CSS framework (rejected — dependency rules).

### Decision 2: Daypart beside date in the top row

The daypart segmented control pairs semantically with the date ("when"). Measured on a 390px viewport: date input ~173px wide, daypart segmented control ~173px wide with each pill ~86px — "☀ Morning" and "☾ Afternoon" render complete without truncation. Pill height (~61px) is taller than the date input (~39px) due to padding, making row 1 ~89px tall — acceptable, slightly taller than other rows.

**Alternatives considered:**
- Daypart as own full-width row (cleaner pill sizing, costs one extra row; rejected to save vertical space).
- Daypart as icon-only 3rd cell in the time row (loses labels, accessibility cost; rejected).

### Decision 3: Single sticky bar with Back + Save, replacing `StickyCta` + in-flow button

Consolidate the existing `StickyCta` (back link, placed after the form) and the in-flow Save button into one `<div class="sticky-submit">` inside the form, using a 2-col grid. Back = `<a role="button">` (secondary, no `.contrast`), Save = `<button class="contrast">` (primary). The sticky bar uses the same pattern as the existing `.sticky-cta` CSS (`position: sticky; bottom: 0`). Form gets `padding-bottom: 90px` so the sticky bar (75px tall) never overlaps the last field when scrolled to the end — measured 12px gap at max scroll.

The `StickyCta` component is not deleted (other pages may use it); the trip form simply stops using it and uses the new sticky bar markup inline.

**Alternatives considered:**
- Keep `StickyCta` separate, make only Save sticky (two sticky elements can fight for the bottom; rejected).
- Make the whole form sticky-positioned (overkill, breaks scrolling).

### Decision 4: Units in `<small>` muted text

Wrap unit suffixes in `<small>` inside `<label>`: e.g. `Distance <small>(km)</small>`. CSS `.trip-form label small { font-size: 0.7rem; color: var(--pico-muted-color); }` shrinks units to ~11.2px vs 16px label text. Measured: "Consumption (kWh/100km)" fits in 173px without wrapping. All labels stay 173×83 uniform — no alignment break. This is styling ladder option 2 (Pico variable + element selector), no new class needed on each label.

**Alternatives considered:**
- Abbreviate units (`kWh/100` → loses clarity).
- Drop units entirely (loses information).

### Decision 5: Tighter input padding via Pico variable override

Override `--pico-form-element-spacing-vertical: 0.4rem` and `--pico-form-element-spacing-horizontal: 0.6rem` (scoped to `:root` or `.trip-form`). Shrinks input height, giving the 2-column layout breathing room on phone. This is styling ladder option 2 (Pico variable override), not a new rule.

### Decision 6: Remove duration `<output>` and hidden `duration_min` input

Delete the `<output name="duration_min">` and `<input type="hidden" name="duration_min">` from `TripFormPage.tsx`. The server-side handler in `src/backend/html-handlers.tsx` already injects `duration_min` before `.parse()` (per existing spec); no handler change needed. Verify no test asserts the presence of these fields.

## Risks / Trade-offs

- **[Risk] Native date picker overflow in a 173px cell on some iOS Safari versions** → Mitigation: tested via Playwright on iPhone 15 viewport (393px); date input renders at 173×39 and the native wheel picker is a full-screen overlay not constrained by cell width. If a specific device overflows, the `.grid--full` modifier is available as a per-row escape hatch.
- **[Risk] Two columns on a very narrow viewport (<360px) could squish inputs** → Mitigation: at 390px each column is 173px which comfortably fits number/time inputs. Below ~340px (older small phones) inputs could get tight; acceptable trade-off for phone-first design, and `minmax(8rem, 1fr)` could be added if needed.
- **[Risk] Sticky bar covers content if `padding-bottom` is wrong** → Mitigation: measured 12px gap at max scroll with 90px padding and 75px sticky bar; padding is generous to absorb minor rendering differences.
- **[Trade-off] Daypart row is ~89px tall vs other rows ~83px** → acceptable; pill padding could be tightened to 0.35rem if visual rhythm matters.
- **[Trade-off] Forcing 2-col on phone overrides Pico's accessibility-conscious collapse** → deliberate; the form is designed for phone-first dense entry, not long-form reading.

## Migration Plan

1. Implement frontend + CSS changes on a feature branch.
2. Run `bun test` — update any test that asserts the old duration field or `StickyCta` usage on the trip form.
3. Verify Docker build (`docker build .`).
4. Eyeball on Playwright iPhone 15 viewport (done during exploration; re-verify after implementation).
5. Rollback: revert the branch. Server-side duration derivation is unaffected; the hidden `duration_min` input can be restored to the form if any downstream code expected it (none does today).

## Open Questions

- **Client-side live duration display**: should a small inline `<script>` compute and show the duration live as the user edits times (display only, not sent)? This is a UX nicety that catches "end before start" mistakes before submit. AGENTS.md permits "vanilla js if absolutely needed" — borderline. Deferred to a separate change if desired; this change removes the field entirely and relies on server-side derivation only.
