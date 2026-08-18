## Context

The stats region (`StatsChartsFragment`) renders a `stats-period-label` block that currently always shows `data.label` (e.g. `August 2026`, `2026`, `W34 2026`) next to the car icon and vehicle description. The period is already surfaced by the period switcher and the period navigation picker, so the label is redundant, and the week form (`W34 2026`) is additionally opaque to humans. See `proposal.md` for motivation.

The backend already computes ISO-week bounds in the display timezone via `periodBoundsUtc` (`src/utils/dates.ts:243`) and exposes them as `bounds.current.startUtc` / `endUtc` inside `computeStatsView` (`src/backend/stats.tsx:142`). `data.label` itself is produced by `periodLabelFn` (`src/backend/stats.tsx:122`) and is currently only consumed by `StatsChartsFragment`'s `stats-period-label` block — no other renderer reads it.

## Goals / Non-Goals

**Goals:**
- Make the `stats-period-label` block period-aware: week mode shows a human-readable `dd MMM – dd MMM` week-bounds string; month and year modes show only the vehicle indicator.
- Keep the backend as the single source of truth for date formatting (the fragment stays free of timezone arithmetic), matching the existing pattern where `label` is computed server-side.
- Preserve `data.label` on `StatsView` for non-fragment consumers (page title, future use) — only the fragment rendering changes.

**Non-Goals:**
- Touching the period switcher, period navigation picker, or chart rendering.
- Changing the `StatsView.label` field or its computation.
- Restyling the block beyond conditional rendering — no new CSS rules unless the existing layout breaks.

## Decisions

### Decision 1: Compute `weekBoundsLabel` in `computeStatsView`, not in the fragment

Add an optional `weekBoundsLabel: string | null` field to `StatsView`. `computeStatsView` populates it only when `period === "week"`, deriving the bounds from the already-available `now` (which is constructed in the display timezone by `resolveAnchor`) — Monday is `now.startOf("week")`, Sunday is `now.startOf("week").plus({ days: 6 })`, both formatted `dd MMM`. In month/year mode the field is `null`.

**Why over the alternative:** The fragment has no timezone context and would have to re-parse `data.date` (`YYYY-Www`) with Luxon, duplicating the bounds logic already centralized in `periodBoundsUtc`/`resolveAnchor`. Keeping date formatting server-side matches how `label`, `prevDate`, and `nextDate` are already produced.

**Alternative considered:** Render in the fragment from `data.date`. Rejected for the reasons above.

### Decision 2: Conditional rendering in `StatsChartsFragment`'s `stats-period-label` block

Replace the unconditional `<small>{data.label}</small>` with:

- When `data.weekBoundsLabel` is non-null (week mode): render `<small>` containing the week-bounds string, before the vehicle indicator `<small>`.
- When `data.weekBoundsLabel` is null (month/year mode): render no period-label `<small>` at all — only the vehicle indicator `<small>` (when a vehicle exists).

The vehicle indicator `<small>` (car icon + `data.vehicle.description`) is unchanged and renders whenever `data.vehicle` is present, in all periods. `data.label` is no longer referenced by the fragment.

**Why over the alternative:** Keeps the vehicle badge visible across all periods (it identifies which vehicle the stats are for) while removing only the redundant period text. Matches the user's "do not display anything else than the car in month or year mode."

### Decision 3: Reuse Luxon `dd MMM` token, same locale as existing series labels

The week-bounds string uses the same `dd MMM` format already used for per-trip and per-day series labels in `computeStatsView` (`r.time.toFormat("dd MMM")`), so the month abbreviation locale is consistent across the page. Separator is ` – ` (en dash with spaces), matching common date-range typography.

## Risks / Trade-offs

- [Risk] The `stats-period-label` block becomes visually empty in month/year mode when no vehicle exists (no period text, no car). → **Mitigation**: Acceptable per the spec ("render only the vehicle indicator when a vehicle exists"); the block is a `<div>` with no minimum height and collapses cleanly. Existing CSS does not impose a min-height on it.
- [Risk] Locale of the month abbreviation is Luxon's default (en) which may not match a future i18n story. → **Mitigation**: The whole page already assumes en month abbreviations (`MMMM yyyy`, `dd MMM`); this change is consistent, not a regression. Defer i18n to a dedicated change.
- [Risk] `data.label` is no longer rendered anywhere, so a reader of the spec might assume it is dead. → **Mitigation**: Field is kept on `StatsView` intentionally for the page title / future consumers and is documented as such in the spec's "Period label block" requirement.

## Migration Plan

1. Add `weekBoundsLabel` to `StatsView` interface (in `src/backend/stats.tsx`, mirrored in `src/frontend/pages/StatsPage.tsx`).
2. Populate it in `computeStatsView` for the week period.
3. Update `StatsChartsFragment`'s `stats-period-label` block to the conditional rendering.
4. Update `src/frontend/__tests__/stats-charts.test.tsx` assertions: week mode asserts the `dd MMM – dd MMM` string is present and `data.label` is not; month/year modes assert the period label string is absent and the vehicle badge (if any) is present.
5. Run `bun test` and `bun run lint`/`typecheck` per repo conventions.

**Rollback:** Revert the fragment to render `<small>{data.label}</small>` unconditionally and drop the `weekBoundsLabel` field from `StatsView`. No data or schema migration is involved.
