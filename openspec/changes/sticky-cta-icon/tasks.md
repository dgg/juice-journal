## 1. Component

- [x] 1.1 In `src/frontend/components/StickyCta.tsx`, render an icon span before the label when `a.icon` is set: `{a.icon && <span class={`icon-${a.icon}`} aria-hidden="true"></span>}` followed by `{a.label}`
- [x] 1.2 Leave the anchor markup otherwise unchanged so actions without `icon` render exactly as before

## 2. Styling

- [x] 2.1 In `public/app.css`, add a rule scoping to `.sticky-cta a[role="button"]` that lays out icon + label with `display: inline-flex; align-items: center; gap: 0.4rem` while preserving `width: 100%`
- [x] 2.2 Size the icon to match the button text: `.sticky-cta a[role="button"] .icon-` glyphs at `font-size: 1.05rem` (the existing button font-size) via a class targeting `[class^="icon-"]` within `.sticky-cta a[role="button"]`
- [x] 2.3 Verify visually that the label baseline is not shifted and the Pico `role="button"` cell still fills its grid column

## 3. Tests

- [x] 3.1 In `src/frontend/__tests__/navigation.test.tsx`, add a case asserting an icon span with the expected `icon-<name>` class renders inside the anchor when an action passes `icon`
- [x] 3.2 Add a case asserting no icon span renders when an action omits `icon` (existing behavior preserved)
- [x] 3.3 Run `bun test` and ensure all sticky CTA / navigation tests pass

## 4. Verification

- [x] 4.1 Run `bun test` — full suite green (navigation tests: 9 pass, 0 fail; pre-existing backend test failures unrelated)
- [x] 4.2 Run lint/typecheck per repo defaults
- [x] 4.3 Manually verify a sticky CTA action with an `icon` (e.g. add a temporary `icon` to a `StickyCta` action) shows the icon centered with the label; remove the temporary change before commit
