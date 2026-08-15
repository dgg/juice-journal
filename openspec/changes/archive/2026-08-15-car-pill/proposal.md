## Why

The vehicle pill (badge) shown on the home page header and stats page currently displays text only. Adding the `car-front` icon inline makes it visually consistent with the icon-driven pattern established by the sticky CTA, stat selector, and empty-state icons.

## What Changes

- The vehicle badge/pill renders a `car-front` `lucide-static` font icon inline before the vehicle description text
- Applied wherever the vehicle badge is rendered: home page header and stats page title area
- Icon sized and vertically aligned with the text, following the established icon-label pattern

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-views`: The "Vehicle badge uses small" scenario is modified to require the `car-front` icon rendered inline before the vehicle description

## Impact

- `src/frontend/components/Header.tsx` (or wherever the vehicle badge component lives) — add `icon-car-front` span before the vehicle description
- `public/app.css` — scoped rule to size and align the icon within the badge (follows `.badge` class pattern)
- No API changes, no new dependencies