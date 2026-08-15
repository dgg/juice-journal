## 1. Component

- [x] 1.1 In `src/frontend/components/EmptyState.tsx`, add an optional `message` prop (default `"No trips yet — log your first commute"`) so callers can pass a custom message
- [x] 1.2 Render a `circle-off` icon span (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline before the message text
- [x] 1.3 In `src/frontend/fragments/StatsChartsFragment.tsx`, pass `message="No stats for this period"` to `<EmptyState />`

## 2. Styling

- [x] 2.1 In `public/app.css`, change `.empty-state` to lay out icon + text with `display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem` while preserving `text-align: center; padding: 3rem 1rem; color: var(--pico-muted-color)`
- [x] 2.2 Add `.empty-state [class^="icon-"] { font-size: 1rem }` so the icon matches the message text size
- [x] 2.3 Verify visually that the icon is centered with the text and the message baseline is not shifted

## 3. Tests

- [x] 3.1 Add a test asserting the `EmptyState` default render contains the `icon-circle-off` element and the default message text
- [x] 3.2 Add a test asserting a custom `message` prop renders the provided text (and the icon)
- [x] 3.3 Add a test asserting `StatsChartsFragment` (empty period) renders the "No stats for this period" message with the `circle-off` icon
- [x] 3.4 Run `bun test` and ensure all empty-state / navigation / stats-charts tests pass

## 4. Verification

- [x] 4.1 Run `bun test` — full suite green (107 pass, 5 pre-existing backend failures, 4 skip)
- [x] 4.2 Run `prettier --check` on edited files
- [x] 4.3 Manually verify the home page empty state shows the `circle-off` icon with "No trips yet" text, and the stats empty state shows the icon with "No stats for this period" text, both centered
