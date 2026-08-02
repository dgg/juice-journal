## Context

The juice-journal app currently has backend API endpoints but no user-facing UI. Need to implement a server-rendered home page that displays trip statistics and list. The app uses Bun, TypeScript, Hono framework, PostgreSQL, HTMX for interactions, and PicoCSS for styling. The existing trip data model and date utilities should be leveraged.

## Goals / Non-Goals

**Goals:**

- Implement server-rendered home page with current month trip statistics
- Create responsive layout optimized for mobile first
- Provide smooth UX for viewing and expanding trip details
- Enable month-over-month comparisons for key metrics

**Non-Goals:**

- Implement the trip creation form (separate change)
- Modify database schema (consumption NOT NULL migration separate)
- Add advanced charting beyond basic stats display
- Implement multi-vehicle switching UI (future enhancement)

## Decisions

### Server-Side Rendering Approach

Use Hono framework to implement GET `/` route that queries database directly and renders HTML template. This avoids API round-trips for UI rendering and keeps implementation simple. The existing date utility functions `resolveDisplayTz` and `currentMonthBoundsUtc` will be reused for timezone-aware month calculations.

### Data Aggregation Strategy

Compute statistics server-side using direct PostgreSQL queries:

- Current month aggregates: AVG consumption, AVG duration, SUM distance
- Previous month aggregates: same metrics for MoM comparison
- Trip list: current month trips joined with location data, ordered by end_time DESC
- Vehicle selection: query MAX(end_time) trip to determine displayed vehicle

### Frontend Implementation

Use HTMX for progressive enhancement and PicoCSS for responsive styling. Implement trip row expand/collapse using `<details>`/`<summary>` elements to avoid JavaScript complexity. Layout will adapt from stacked (mobile) to split columns (desktop) using CSS Grid/Flexbox.

### Daypart Visualization

Encode morning/afternoon as both icon and color for accessibility: morning = ☀ amber, afternoon = 🌙 indigo. This provides visual distinction while maintaining color-blind friendliness.

### Empty State Handling

When no trips exist for current month, display special message "No trips yet — log your first commute" pointing to the CTA, while maintaining consistent layout structure.

## Risks / Trade-offs

**[Performance with large datasets]** → Limit to current month only, add pagination if needed in future
**[Timezone complexity]** → Reuse existing date utility functions to leverage established timezone handling patterns  
**[Schema inconsistencies with NULL values]** → Handle gracefully in queries (AVG skips NULLs), defer NOT NULL migration to separate change
**[Display vehicle selection rigidity]** → Simple approach (latest trip's vehicle) meets current needs; extensible to vehicle selector later
**[MoM comparison accuracy mid-month]** → Accept that distance totals are only comparable month-end; focus on per-trip averages for fair comparison
