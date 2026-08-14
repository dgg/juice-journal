## Context

The stats period series query (`statsQueries.periodSeries` in `src/db/queries/stats.ts`) currently fetches trip data and immediately constructs a display label — formatting a date (`dd MMM`) and appending a daypart emoji (`☀`/`🌙`) — inside the DB access layer. This couples data retrieval to presentation and destroys the `daypart` value as structured data. The backend handler (`computeStatsView` in `src/backend/stats.tsx`) passes the pre-built labels through unchanged. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Move label construction (date formatting + daypart icon) from the DB query layer to the backend rendering layer.
- Carry `daypart` as structured data (`string | null`) through the query → backend pipeline.
- Keep the embedded Chart.js JSON payload (`series.labels: string[]` + metrics) unchanged so Chart.js and `stats.mjs` are untouched.

**Non-Goals:**

- Introducing Lucide icons or any icon library (future change).
- Changing the chart axis, tooltip, or any canvas-rendered output.
- Changing the embedded JSON shape that `stats.mjs` consumes.
- Touching the database schema or SQL queries (only the TypeScript mapping of results changes).

## Decisions

### Decision 1: `PeriodSeriesRow` carries `time` and `daypart`, not `label`

The `PeriodSeriesRow` interface changes from `{ label: string, ... }` to `{ time: DateTime, daypart: string | null, ... }`.

**Rationale:** The DB query's job is to return data it fetched, not a presentation string it fabricated. `time` is the raw temporal anchor (trip `end_time` for the `trip` bucket, bucket start for aggregated buckets); `daypart` is the per-trip value or `null` for aggregated buckets.

**Alternative considered:** Keep `label` and add `daypart` alongside it. Rejected — it leaves the DB layer still doing formatting, which is the problem this change solves.

### Decision 2: Label construction lives in `computeStatsView`

The backend handler builds `series.labels` from `rows.map(r => ...)`, applying the format per bucket. The bucket is already known at this layer (`period === "year" ? yearGranularity : period === "month" ? "day" : "trip"`), so the rendering logic has the context it needs.

```
bucket → label format
─────────────────────────────────────
trip   → toFormat("dd MMM") + " " + daypartIcon  (icon only if daypart non-null)
day    → toFormat("dd MMM")
week   → toFormat("'W'WW")
month  → toFormat("MMM")
```

**Rationale:** The rendering layer is the only place that knows both the bucket type and the display context. Putting it here means the DB query stays a pure data fetch.

**Alternative considered:** A separate label-formatting helper module. Rejected as over-engineering — the logic is a few lines and lives naturally next to the series assembly.

### Decision 3: `daypart` is `string | null`, not `string | undefined`

Aggregated buckets (`day`, `week`, `month`) produce rows where no single daypart applies. These carry `null`, not `undefined`.

**Rationale:** `null` reads as "intentionally absent" (aggregation), `undefined` reads as "not set." The distinction matters for the rendering layer's icon check. Matches the existing convention in the codebase (e.g., `avg_speed_kmh: number | null`).

## Risks / Trade-offs

- **[Risk] Test coverage is thin** — `src/db/queries/stats.test.ts` only asserts `typeof label === "string"` (lines 155, 171). The new fields (`time`, `daypart`) need assertions to lock the contract.
  → **Mitigation:** Update tests to assert on `time` (DateTime) and `daypart` (`string | null`). Add a case verifying the `trip` bucket carries non-null daypart and aggregated buckets carry `null`.

- **[Risk] Subtle label regression** — moving the format string (`dd MMM`) from the query to the backend could silently change output if the Luxon format string is mistyped.
  → **Mitigation:** The format strings move verbatim — same strings, same Luxon API. Verify with existing chart rendering (week period shows `14 Aug ☀`).

- **[Trade-off] Internal contract is breaking** — any other consumer of `PeriodSeriesRow.label` would break. Currently there is exactly one consumer (`computeStatsView`), so the blast radius is contained.

## Migration Plan

No data migration. The change is a single-commit refactor:

1. Update `PeriodSeriesRow` type and `periodSeries` body (return `time` + `daypart`, drop label construction).
2. Update `computeStatsView` to build `series.labels` from `rows`.
3. Update tests.
4. Verify: `bun test`, manual check of week-period chart axis labels.

**Rollback:** Revert the commit. No schema, no migration, no external API change.