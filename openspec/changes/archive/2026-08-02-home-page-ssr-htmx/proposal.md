## Why

Need a server-rendered home page for juice-journal that displays monthly trip stats and list. Currently the app has no UI - only API endpoints exist. Users need a responsive interface to view their commute data and log new trips, optimized for phone usage as the primary interaction pattern.

## What Changes

- Add new server-rendered home page at `/` route displaying current month's trip statistics
- Implement server-side aggregation of trip data (consumption, duration, distance) with month-over-month comparisons
- Create responsive trip list showing recent trips with ability to expand for details
- Add prominent "Log new trip" CTA optimized for mobile thumb access
- Implement empty state for new users or beginning of month
- Support vehicle selection (display trips for vehicle of most recent trip)

## Capabilities

### New Capabilities

- `home-page-ssr`: Server-rendered home page displaying monthly trip statistics and list with responsive design optimized for mobile

### Modified Capabilities

## Impact

- New route `/` in backend handlers
- New frontend template files in src/frontend/
- Utilizes existing trip data queries and date utilities
- Adds server-side aggregation logic for stats display
- Responsive layout affects overall UI architecture
- New dependency on HTMX/Pico CSS for frontend rendering
