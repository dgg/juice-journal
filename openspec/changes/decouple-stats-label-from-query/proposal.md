## Why

The stats query (`statsQueries.periodSeries`) constructs display labels — formatting dates and appending daypart emoji (`☀`/`🌙`) — inside the DB access layer. This couples data retrieval to presentation: the query knows about icons, date formats, and bucket types. The daypart is melted into a label string and lost as structured data, blocking any future consumer (chart tooltips, alternative renderings) from accessing it. The DB layer should fetch; the rendering layer should render.

## What Changes

- **BREAKING** (internal contract): `PeriodSeriesRow` replaces `label: string` with `time: DateTime` and `daypart: string | null`. This is a TypeScript interface change between the DB query layer and the backend rendering layer — no SQL, migration, or schema change.
- `periodSeries` (DB query) returns raw `time` and `daypart` per row; it no longer formats labels or selects icons.
- `computeStatsView` (backend, `stats.tsx`) builds the `series.labels` array at the rendering layer, applying bucket-specific date formats (`dd MMM` for trip/day, `'W'WW` for week, `MMM` for month) and appending the daypart UTF icon only for the `trip` bucket (where daypart is non-null).
- Aggregated buckets (`day`, `week`, `month`) carry `daypart: null`; the rendering layer emits no icon for those rows.
- Tests in `src/db/queries/stats.test.ts` shift from asserting `typeof label === "string"` to asserting on `time` and `daypart` fields.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-stats`: The chart series payload contract changes — the DB query layer returns raw time and daypart instead of pre-formatted labels; the backend rendering layer assembles display labels from that structured data.

## Impact

- **Code**: `src/db/queries/stats.ts` (`PeriodSeriesRow` type, `periodSeries` body), `src/backend/stats.tsx` (`computeStatsView` series assembly), `src/db/queries/stats.test.ts` (assertions).
- **APIs**: No public API change. The embedded `<script id="stats-data">` JSON shape is unchanged (`labels: string[]` plus metrics) — Chart.js and `stats.mjs` are untouched.
- **Dependencies**: None added or removed.
- **DB**: Zero schema impact. No migrations.
- **Rollback**: Revert the three files. The contract change is internal and reversible in a single commit; no data migration is involved.