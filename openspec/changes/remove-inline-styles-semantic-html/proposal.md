## Why

`AGENTS.md` and the `frontend-views` spec mandate that custom CSS lives only in `public/app.css` and that semantic HTML is the first styling choice. In practice, five view components (`Header`, `StatCard`, `TripRow`, `Delta`, `EmptyState`) carry ~41 inline `style={{...}}` props and use `<div>` elements where headings, `<time>`, `<data>`, and `<dl>` are the correct semantic choice. The spec's "Application stylesheet contract" forbids inline `<style>` blocks but is silent on inline `style` attributes, leaving the contradiction unenforced.

## What Changes

- **Tighten the stylesheet contract**: inline `style` attributes (`style={{...}}` / `style="..."`) SHALL NOT appear in any view component, matching the existing rule for `<style>` blocks. All styling moves to `public/app.css` under domain-semantic class names (e.g. `trip-snapshot`, `stat-card`, `badge`) — never utility names like `.flex-1` or `.text-center`.
- **Adopt semantic HTML elements** in the five components: `<h1>`/`<h3>` for titles, `<time datetime>` for timestamps, `<data value>` for machine-readable numeric values, `<small>` for secondary text and badges, `<p>` for prose, `<dl>`/`<dt>`/`<dd>` for term-description pairs.
- **Accept Pico's native element sizing**: no manual `font-size`/`font-weight` overrides on text elements; the correct semantic element carries Pico's default styling.
- **Expand `public/app.css`** with domain-named layout rules (`trip-snapshot` grid, `stat-card` variants, `badge`, `summary` reset) — the sanctioned last-resort path per the existing preference order.

No backend, API, database, or behavior changes. Visual output is intended to be equivalent; discrepancies will be caught by visual review.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `frontend-views`: Tightens the "Application stylesheet contract" requirement to forbid inline `style` attributes (not just `<style>` blocks) and adds a new "Semantic HTML element selection" requirement governing which elements view components SHALL use for titles, timestamps, numeric values, and term-description pairs.

## Impact

- **Code**: `src/frontend/components/{Header,StatCard,TripRow,Delta,EmptyState}.tsx` rewritten (markup + class names, no logic changes). `public/app.css` gains ~30-40 lines of domain-named rules.
- **APIs / DB / dependencies**: none.
- **Risk**: visual regression only; mitigated by element-by-element visual review after implementation.
- **Rollback**: revert the commits on the feature branch; no schema or data migration to reverse.
