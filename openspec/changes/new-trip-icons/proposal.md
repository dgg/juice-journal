## Why

Trip detail labels ("Distance", "Duration", "Avg speed", etc.) and stat card labels ("Avg consumption", "Avg duration", "Total distance") are plain text with no visual hierarchy. Adding Lucide icons alongside these labels makes the UI scannable at a glance — consistent with the icon-first pattern already established in the daypart indicator, vehicle badge, stats period switcher, empty state, and sticky CTA.

## What Changes

- **TripRow detail panel**: Add Lucide icons to each `<dt>` label in the `trip-snapshot` definition list
- **TripForm labels**: Add Lucide icons to each form field label (date, times, distance, odometer, speed, consumption, locations, vehicle)
- **StatCard labels**: Add Lucide icons to the three stat cards (avg consumption, avg duration, total distance)
- **CSS**: Add sizing rules for snapshot-label icons, form-label icons, and stat-label icons (same pattern as existing `.badge [class^="icon-"]` and `.empty-state [class^="icon-"]`)
- No behavior changes — purely visual enhancement

## Capabilities

No spec-level behavior changes (pure UI polish). Skip specs.

## Impact

- `src/frontend/components/TripRow.tsx` — add icon spans to `<dt>` elements in trip-snapshot
- `src/frontend/pages/TripFormPage.tsx` — add icon spans to form field labels
- `src/frontend/components/StatCard.tsx` — add icon spans to stat labels (or `StatsChartsFragment.tsx` `StatCard` — both locations)
- `public/app.css` — add `.trip-snapshot dt [class^="icon-"]`, `.trip-form label [class^="icon-"]`, and `.stat-card__label [class^="icon-"]` sizing rules