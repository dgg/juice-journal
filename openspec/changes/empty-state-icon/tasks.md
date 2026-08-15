## 1. Component

- [ ] 1.1 In `src/frontend/components/EmptyState.tsx`, add an optional `message` prop (default `"No trips yet — log your first commute"`) so callers can pass a custom message
- [ ] 1.2 Render a `circle-off` icon span (`<span class="icon-circle-off" aria-hidden="true"></span>`) inline before the message text
- [ ] 1.3 In `src/frontend/fragments/StatsChartsFragment.tsx`, pass `message="No stats for this period"` to `<EmptyState />`

## 2. Styling

- [ ] 2.1 In `public/app.css`, change `.empty-state` to lay out icon + text with `display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem` while preserving `text-align: center; padding: 3rem 1rem; color: var(--pico-muted-color)`
- [ ] 2.2 Add `.empty-state [class^="icon-"] { font-size: 1rem }` so the icon matches the message text size
- [ ] 2.3 Verify visually that the icon is centered with the text and the message baseline is not shifted

## 3. Tests

- [ ] 3.1 Add a test asserting the `EmptyState` default render contains the `icon-circle-off` element and the default message text
- [ ] 3.2 Add a test asserting a custom `message` prop renders the provided text (and the icon)
- [ ] 3.3 Add a test asserting `StatsChartsFragment` (empty period) renders the "No stats for this period" message with the `circle-off` icon
- [ ] 3.4 Run `bun test` and ensure all empty-state / navigation / stats-charts tests pass

## 4. Verification

- [ ] 4.1 Run `bun test` — full suite green (modulo pre-existing backend failures)
- [ ] 4.2 Run `prettier --check` on edited files
- [ ] 4.3 Manually verify the home page empty state shows the `circle-off` icon with "No trips yet" text, and the stats empty state shows the icon with "No stats for this period" text, both centered
