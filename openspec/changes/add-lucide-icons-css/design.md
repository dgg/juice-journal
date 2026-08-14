## Context

The app loads `lucide@1.31.0` JS (UMD) in `Layout.tsx:38` but never calls `lucide.createIcons()`, so the 70 KB script is dead weight. Icons in DOM components are ad-hoc UTF symbols (`☀`/`🌙`/`☾`/`◀`/`▶`). Chart.js axis labels also use UTF emoji, but those live on the canvas — unreachable by CSS or DOM — and are explicitly out of scope. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Load Lucide icons via CSS font (`lucide-static`), no JavaScript.
- Replace UTF symbols in DOM components with Lucide icon font classes.
- Keep chart canvas labels (axis, tooltip) using UTF symbols — canvas cannot render CSS.

**Non-Goals:**

- Per-icon SVG inlining or an `<Icon>` component (over-engineering for ~5 icons).
- Changing Chart.js, `stats.mjs`, or canvas rendering.
- The stats label decoupling (separate change: `decouple-stats-label-from-query`).

## Decisions

### Decision 1: Icon font via CDN `<link>`, not npm install

Load `lucide-static@1.31.0/font/lucide.css` via a `<link rel="stylesheet">` in `Layout.tsx`, matching the existing pattern for Pico CSS and HTMX (all CDN with SRI hashes).

**Asset sizes:**
- `lucide.css`: ~96 KB (contains `@font-face` + ~1500 `icon-*::before` rules)
- `lucide.woff2`: ~271 KB (the only font format a modern browser fetches; `@font-face` lists woff/ttf/svg as fallbacks but browsers pick woff2)

**SRI hash (computed for v1.31.0):** `sha256-hjpe3MZ8jfUdYxEU56nZduEXHqSiIJnpoqev6cK35KM=`

The `@font-face` uses relative `url()` references, so font files resolve to the same CDN path (`https://unpkg.com/lucide-static@1.31.0/font/lucide.woff2`).

**Alternative considered:** `npm install lucide-static` + self-host the font files. Rejected — the project loads Pico and HTMX via CDN already; self-hosting adds build complexity for no gain at this scale. The CDN pattern is established.

**Alternative considered:** Individual SVG files from `lucide-static/icons/*.svg` inlined server-side via an `<Icon name="sun" />` component. Rejected — more moving parts (an SVG loader, a component, per-icon imports) for ~5 icons. The font is simpler and matches the "no client JS" constraint.

### Decision 2: Remove the unused `lucide.min.js` `<script>`

The existing `<script src="https://cdn.jsdelivr.net/npm/lucide@1.31.0/dist/umd/lucide.min.js">` in `Layout.tsx:38` is removed entirely. No code calls `lucide.createIcons()`, so it has zero effect today.

**Rationale:** Dead JavaScript that ships 70 KB to every page for no output is worse than no JavaScript. Removing it is a net win even before the CSS font is added.

### Decision 3: Icons as `<span class="icon-*">`, aria-hidden for decorative icons

Icons are rendered as `<span class="icon-sun" aria-hidden="true"></span>`. The `aria-hidden` hides the glyph from screen readers since the icon is decorative — the daypart is already conveyed by surrounding text (trip date, form label text).

**Rationale:** The lucide CSS uses `::before { content: "\e178" }` — the pseudo-element renders the glyph. An empty `<span>` with the class is the canonical usage. `aria-hidden="true"` prevents the private-use Unicode codepoint from being read aloud as nonsense.

### Decision 4: Chart axis labels keep UTF — no plugin, no drawImage

Chart.js renders axis ticks via `ctx.fillText(label, x, y)` on the canvas pixel buffer. Neither CSS `::before` (no DOM) nor JS SVG injection (no DOM) can reach the canvas. Forcing Lucide there would require a custom Chart.js plugin that rasterizes SVGs via `ctx.drawImage()` — disproportionate effort for 2 icons on one chart type. UTF emoji works on canvas because the browser falls back to the system emoji font.

**Rationale:** The canvas/HTML boundary is a rendering-target constraint, not a library-format constraint. Accept the split.

## Risks / Trade-offs

- **[Trade-off] Font ships all ~1500 icons** — the woff2 is ~271 KB even though only ~5 icons are used. Acceptable for a personal app; tree-shaking a font isn't possible. If this ever matters, switch to per-icon SVG inlining (Decision 1 alternative).
- **[Risk] CDN availability** — if unpkg is down, icons don't render. Same risk as the existing Pico/HTMX CDN dependencies. The page degrades gracefully — icon spans are empty, layout is unaffected.
- **[Risk] SRI hash mismatch on version bump** — if the version is updated, the SRI hash must be recomputed. Mitigated by pinning `@1.31.0` (not `@latest`).
- **[Risk] Font loading flash** — icons may pop in after the woff2 loads. Mitigated by `font-display: swap` (browser default) and the small number of icons.

## Migration Plan

No data migration. Single-commit change:

1. Swap the `<script>` for `<link>` in `Layout.tsx`.
2. Replace UTF symbols with `<span class="icon-*">` in the three components.
3. Add minimal sizing to `app.css` if needed.
4. Verify: `bun test`, `docker build .`, manual visual check of all icon surfaces.

**Rollback:** Revert the commit. Restore the JS `<script>` and UTF symbols. No schema, no migration.