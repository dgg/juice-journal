## Why

Type definitions are duplicated across the SSR boundary (the `Trip` view model is declared 4×, `StatsView`/`StatWithDelta` 3-4×), `DateTime` is needlessly converted to `Date` at a boundary that does not exist (no client bundle ships), and unit-bearing column names (`duration_min`, `avg_consumption_kwh_100km`) create naming ceremony with no consumer benefit. This refactor consolidates type ownership, shares `DateTime` freely, and strips unit suffixes so the row type and the view model converge toward identity.

## What Changes

- **BREAKING** — DB column renames in `trips`: `duration_min`→`duration`, `distance_km`→`distance`, `avg_speed_kmh`→`speed`, `avg_consumption_kwh_100km`→`consumption`, `odometer_km`→`odometer`. Units are documented in the migration and the row type, not the name.
- **BREAKING** — `POST /api/trips` request body field names renamed to match (no API consumers; pre-production).
- `DateTime` (luxon) becomes the canonical in-app type, shared across backend and frontend SSR views. The `DateTime`→`Date` conversion at the SSR boundary is removed; the DB driver's `Date` is absorbed only in the query mapper (`toUtcDateTime`), as today.
- View models become projections of row types: frontend components import backend row/view types type-only (`import type`); backend never imports frontend. The repeated `Trip` declarations collapse to the shared `TripWithLocationRow`.
- `weather_start`/`weather_end` typed as `WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">` instead of `object | null`, removing blind casts.
- `Daypart` (`"morning" | "afternoon"`) shared as a named union, no longer widened to `string` in views.

## Capabilities

### New Capabilities

_(none — the type-ownership and DateTime-sharing decisions are architectural, captured in design.md; they change no observable behavior.)_

### Modified Capabilities

- `trips-api`: trips table column names and `POST /api/trips` request field names are renamed to drop unit suffixes; a new dbmate migration performs the rename with a down script.

## Impact

- **DB**: new migration renaming 5 `trips` columns (up/down). Schema change — requires human review per AGENTS.md.
- **API**: `POST /api/trips` request contract changes (BREAKING). No live consumers.
- **Code**: `src/backend/types.ts` (zod schema), `src/backend/db/queries/trips.ts` & `stats.ts` (row types, mappers), `src/backend/home.tsx` / `html-handlers.tsx` / `stats.tsx` (handlers stop converting to `Date`), `src/frontend/**` (components consume row types directly, drop local `Trip`/`StatsView`/`StatWithDelta` declarations).
- **Tests**: trip-row, navigation, stats-charts, and db query tests updated to the new shapes.
- **Dependencies**: none added or removed.

### Rollback

Run `bunx dbmate down` on the rename migration to restore the unit-suffixed columns, then revert the code commits. The change is a pure rename plus type-only reorganization; no data transformation is involved, so existing rows are unaffected and rollback needs no data migration.