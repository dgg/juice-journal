## 1. Generalize StickyCta component

- [ ] 1.1 Update `src/frontend/components/StickyCta.tsx` props to accept `actions: Array<{ href: string; label: string; variant?: "contrast" | "secondary" }>`, preserving single-action compatibility
- [ ] 1.2 Render the actions inside a `.sticky-cta > .grid` row, applying the `variant` class (default `contrast`) to each anchor's `role="button"`
- [ ] 1.3 Verify the existing single-action caller shape still renders correctly (no visual regression)

## 2. Wire navigation into pages

- [ ] 2.1 Update `src/frontend/pages/HomePage.tsx` to pass two actions to `StickyCta`: Stats (`secondary`, href `/stats`) and Log new trip (`contrast`, href `/trips/new`)
- [ ] 2.2 Add a `StickyCta` to `src/frontend/pages/StatsPage.tsx` with a single action: Back to home (`contrast`, href `/`), placed after the `<StatsChartsFragment>` inside `<main>` or immediately after it per existing placement convention

## 3. Visual verification

- [ ] 3.1 Load `/` and confirm both Stats and Log new trip anchors render in the sticky CTA row at the bottom
- [ ] 3.2 Load `/stats` and confirm the Back to home anchor renders in the sticky CTA at the bottom
- [ ] 3.3 Activate each anchor and confirm navigation occurs via `hx-boost` (no full document reload)
- [ ] 3.4 Confirm no global top navigation bar appears on any page

## 4. CSS guard (conditional)

- [ ] 4.1 If the `.sticky-cta > .grid` row shows gaps, misalignment, or breaks the existing `.sticky-cta` fixed positioning, add a minimal scoped rule to `public/app.css` under `.sticky-cta .grid` (Pico-grounded, no utility class names). Skip if Pico grid defaults render correctly.

## 5. Tests

- [ ] 5.1 Add a `bun test` case asserting `HomePage` render output contains an anchor with `href="/stats"`
- [ ] 5.2 Add a `bun test` case asserting `StatsPage` render output contains an anchor with `href="/"`
- [ ] 5.3 Add a `bun test` case asserting `StickyCta` renders multiple actions when given an array
- [ ] 5.4 Run `bun test` and confirm all pass
