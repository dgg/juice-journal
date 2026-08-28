## Context

The app is a single Bun process serving SSR HTML via `hono/jsx` — no client bundle ships, so the "frontend" directory is server-side templating (analogous to Rails views), not a browser runtime. Today a `DateTime → Date` conversion and a snake→camel rename are performed at every handler→view handoff, producing parallel view-model types (`Trip` declared 4×, `StatsView`/`StatWithDelta` 3-4×) with no consumer that needs `Date` or camelCase. The REST response (`TripCreationRaw`) already uses unit-free camelCase; only the request schema and DB columns carry unit suffixes. The DB driver returns `Date` for timestamptz, already absorbed into `DateTime` at the query mapper (`toUtcDateTime`) — that boundary stays.

## Goals / Non-Goals

**Goals:**
- One owner per type family; no redeclaration across the SSR boundary.
- `DateTime` (luxon) shared freely end-to-end; no `Date` outside the query mapper.
- Unit-free column/field names internally; units documented, not encoded in names.
- Typed weather snapshots, eliminating blind `as` casts.

**Non-Goals:**
- Changing observable behavior (HTML output, API JSON shape except renamed request fields).
- Introducing a `src/shared/` package or tsconfig path aliases — relative `import type` is sufficient at this scale.
- Branded `Nanoid` types (deferred; optional safety, adds test friction).
- Renaming columns other than the five unit-suffixed ones (`start_time`, `end_time`, `*_location_id`, `tracking_*`, `weather_*` stay).
- Splitting the API contract from internal names — units are stripped everywhere (no API consumers).

## Decisions

### D1: `DateTime` is the canonical in-app type; `Date` stays inside the query mapper

The DB driver's `Date` is converted to luxon `DateTime` in `db/convert.ts` (`toUtcDateTime`) and never escapes. Handlers pass `DateTime` straight to views; components call `setZone(tz).toFormat(...)` (already the pattern in `stats.tsx`) instead of `new Date(x).toLocaleString(..., {timeZone})`. luxon is already a dependency on both sides; no new coupling.

**Alternative considered:** keep `Date` at the view boundary for "view purity." Rejected — there is no browser, no serialization boundary, and no consumer that benefits. The conversion is pure ceremony and the root cause of the duplication.

### D2: Type ownership — backend owns, frontend imports type-only

```
db/queries/*   owns   *Row types (TripRow, TripWithLocationRow, LocationRow, ...)
stats.tsx      owns   computed views (StatsView, StatsSummary, StatWithDelta)
backend/types  owns   API/zod contract (TripInput, TripCreation, Daypart)
frontend/**    imports the above via `import type` only
```

Direction rule: **`frontend → backend` (type-only) is allowed; `backend → frontend` is forbidden; no cycles.** The db schema is the most stable dependency target, so depending toward it follows the stable-dependencies principle. The "frontend owns view models" option was rejected because it inverts ownership around a boundary that doesn't exist.

**Alternative considered:** a neutral `src/shared/` kernel. Rejected for the view models (the DB/stats layer is the natural owner); kept open only if a genuinely cross-cutting framework-free type emerges that neither backend nor frontend should own. `Daypart` and `WeatherSnapshot` are candidates but can live in `backend/types` / `weather/types` respectively for now.

### D3: View models are row projections, not parallel shapes

After D1 (no `Date` conversion) and the unit rename (no suffix), `TripWithLocationRow` and the frontend `Trip` type become structurally identical except for snake_case keys on `start_time`/`start_location`/`weather_start`. The frontend drops its local `Trip` declaration and imports `TripWithLocationRow` directly.

**Remaining snake↔camel decision (aesthetics, low stakes):** keep snake_case flowing to the view (Rails-style, zero transform) — the recommended direction. The only cost is `trip.start_time` in JSX rather than `trip.startTime`. Renaming the ~4 remaining `_time`/`_location` fields would reintroduce a transform layer and a parallel type, undoing the convergence. **Recommendation: keep snake_case; do not rename `start_time`/`end_time`/`*_location_id`/`weather_start`/`weather_end`.** This is the one aesthetic point a reviewer may veto without architectural consequence.

### D4: Utility types where they're honest; named transforms where they're not

- `WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">` — already exists file-local in `fetcher.ts`; promote to `weather/types` and use as the type of `weather_start`/`weather_end`. This kills the `as WeatherData` cast in `TripRow.tsx`.
- `StatsSummary` derived from `StatsView["stats"]` (plus `period`) instead of redeclared.
- `HomeData["stats"] = StatsSummary & { period: "month" }` instead of inlined.
- **Not** a mapped-type key-rewrite for snake↔camel + `DateTime`↔`Date`: for 12 fields that's an opaque one-liner. The honest tool is a single named transform *function* per projection (or, per D3, no transform at all). Don't derive the type from the row with cleverness; let the declared row type be authoritative.

### D5: Migration — new dbmate migration, up/down, units in SQL comments

A new migration renames the five columns and adds `COMMENT ON COLUMN` documenting each unit. Down script renames back. Chosen over editing the init migration in place: dbmate tracks applied migrations, and a dedicated migration is reversible and works even if an environment has data. Pre-production makes either viable, but the migration-discipline path (per the `trips-api` spec) is safer and matches existing conventions.

### D6: `Daypart` as a shared named union

`Daypart = "morning" | "afternoon"` declared once (in `backend/types`, alongside the zod schema), used in row types, the API contract, and view types. Today the frontend widens it to `string`, which silently misclassifies any non-`morning` value as `afternoon` (`TripRow.tsx:53`). The union is shared type-only.

## Risks / Trade-offs

- **[Backend→frontend type import feels inverted]** → It's type-only (`import type`), carries zero runtime coupling, and targets the more-stable owner. Enforceable with a lint `no-restricted-paths` rule if desired, but discipline suffices at ~3 files.
- **[snake_case in JSX]** → Pure aesthetics after D1+rename; no functional cost. Vetoable per D3 without affecting the architecture.
- **[Migration applied to an env with data]** → `ALTER TABLE ... RENAME` is metadata-only, instant, non-locking; no data rewrite. Down migration restores names. Safe.
- **[Test fixtures construct the old shapes]** → Tests build `Trip`/`weatherStart` literals; updating them is mechanical and caught by `tsc`. No behavioral test changes expected since rendered output is unchanged.

## Migration Plan

1. Add the column-rename dbmate migration (up + down with `COMMENT ON COLUMN`).
2. Update `backend/types.ts` zod schema to unit-free request field names; update `Daypart` export.
3. Update `db/queries/trips.ts` & `stats.ts` row types + mappers to new column names; type `weather_start`/`weather_end` as `WeatherSnapshot | null`.
4. Promote `WeatherSnapshot` to `weather/types`; remove the `object | null` holes and the `as WeatherData` cast.
5. Remove `DateTime → Date` conversion + camelCase rename in `home.tsx`, `html-handlers.tsx`; pass rows directly to views.
6. Delete frontend-local `Trip`/`StatsView`/`StatWithDelta` declarations; `import type` the backend owners.
7. Update `api/trips.ts` request/response mapping to the new field names.
8. Update tests; run `bun run check` and `bun test`.
9. **Rollback:** `bunx dbmate down` (rename migration), then revert commits. No data migration needed.