## 1. Generalize StickyCta component

- [x] 1.1 Update `src/frontend/components/StickyCta.tsx` props to accept `actions: Array<{ href: string; label: string; variant?: "contrast" | "secondary" }>`, preserving single-action compatibility
- [x] 1.2 Render the actions inside a `.sticky-cta > .grid` row, applying the `variant` class (default `contrast`) to each anchor's `role="button"`
- [x] 1.3 Verify the existing single-action caller shape still renders correctly (no visual regression)

## 2. Wire navigation into pages

- [x] 2.1 Update `src/frontend/pages/HomePage.tsx` to pass two actions to `StickyCta`: Stats (`secondary`, href `/stats`) and Log new trip (`contrast`, href `/trips/new`)
- [x] 2.2 Add a `StickyCta` to `src/frontend/pages/StatsPage.tsx` with a single action: Back to home (`contrast`, href `/`), placed after the `<StatsChartsFragment>` inside `<main>` or immediately after it per existing placement convention

## 3. Visual verification

- [x] 3.1 Load `/` and confirm both Stats and Log new trip anchors render in the sticky CTA row at the bottom
- [x] 3.2 Load `/stats` and confirm the Back to home anchor renders in the sticky CTA at the bottom
- [x] 3.3 Activate each anchor and confirm navigation occurs via `hx-boost` (no full document reload)
- [x] 3.4 Confirm no global top navigation bar appears on any page

## 4. CSS guard (conditional)

- [x] 4.1 Pico grid defaults render correctly. No CSS needed.

## 5. Tests

- [x] 5.1 Add a `bun test` case asserting `HomePage` render output contains an anchor with `href="/stats"`
- [x] 5.2 Add a `bun test` case asserting `StatsPage` render output contains an anchor with `href="/"`
- [x] 5.3 Add a `bun test` case asserting `StickyCta` renders multiple actions when given an array
- [x] 5.4 Run `bun test` and confirm new tests pass
