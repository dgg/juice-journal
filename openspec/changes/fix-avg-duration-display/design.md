## Context

The stats page (`/stats`) renders five stat cards via an inline `StatCard` function in `src/frontend/fragments/StatsChartsFragment.tsx`. The average-duration card currently passes `data.stats.avgDurationHm` (a pre-formatted `"1h 30m"` string) as the `unit` prop, while the raw minutes number flows into `value`. The result is a visually broken card reading e.g. "90 1h 30m".

A separate, reusable `StatCard` component already exists at `src/frontend/components/StatCard.tsx` and already demonstrates the pattern this change needs: a `Stat` interface with `deltaUnit` (separate from `unit`) so the value-unit and the delta-unit can differ. The inline fragment StatCard lacks that separation.

The backend (`src/backend/stats.tsx`) already produces both `avgDuration` (numeric minutes, with `prev` for delta) and `avgDurationHm` (formatted string) correctly — no backend change is needed.

## Goals / Non-Goals

**Goals:**

- The average-duration stat card displays the hours-and-minutes string as its value and shows no unit suffix next to it.
- The delta for average duration continues to render with a meaningful unit ("min") so the change magnitude is unambiguous.
- The fix follows the existing `deltaUnit` pattern already present in the reusable `StatCard` component.

**Non-Goals:**

- Reformatting the delta itself as hours-and-minutes (the delta stays in minutes with a "min" suffix).
- Migrating the inline `StatCard` to use the reusable `StatCard` component (separate refactor).
- Changing the `StatsView` interface, the backend, or the `/partials/trip-stats` endpoint shape.
- Changing any other stat card (distance, speed, consumption, trip count).

## Decisions

### Decision 1: Add `displayValue` and `deltaUnit` props to the inline StatCard

The inline `StatCard` in `StatsChartsFragment.tsx` gains two optional props:

- `displayValue?: string | null` — when provided and non-null, rendered verbatim as the value text instead of the numeric `formatted` output. The `<data>` element's `value` attribute keeps the numeric `value` for semantic correctness.
- `deltaUnit?: string` — passed to the `Delta` component instead of `unit`, defaulting to `unit` when absent (preserving existing behavior for all other cards).

When `displayValue` is provided and non-null, the `<small>` unit element renders empty (no suffix). When `displayValue` is null (e.g., no trips), the card falls back to `--` with no unit — unchanged from today.

**Rationale:** This mirrors the `deltaUnit` pattern already in `src/frontend/components/StatCard.tsx`, keeping the codebase consistent. It avoids a separate `DurationStatCard` component or a full migration to the reusable StatCard.

**Alternatives considered:**

- *Pass `avgDurationHm` as `value` and `""` as `unit` (literal Option A).* Rejected: `value` is typed `number | null` and is used for delta computation (`value - prev`). Passing a string breaks the delta arithmetic and the `<data value>` semantic attribute.
- *Create a dedicated `DurationStatCard`.* Rejected: over-engineering for a single call site; the `displayValue` override is simpler and reusable if other cards ever need pre-formatted values.
- *Format the delta as hours-and-minutes too.* Rejected as a non-goal; the delta in minutes with a "min" suffix is clear and requires no changes to the `Delta` component.

### Decision 2: Call-site change for the avg-duration StatCard

The avg-duration `StatCard` invocation changes to:

```tsx
<StatCard
    label="Avg duration"
    value={data.stats.avgDuration.value}
    displayValue={data.stats.avgDurationHm}
    unit=""
    deltaUnit="min"
    prev={data.stats.avgDuration.prev}
    icon="hourglass"
    period={data.period}
/>
```

`value` stays numeric (for delta), `displayValue` provides the formatted string, `unit` is empty (value slot shows no suffix), and `deltaUnit="min"` keeps the delta labeled.

## Risks / Trade-offs

- **[Empty `<small>` renders a blank space]** → The `<small>` element still renders with empty content, leaving a trailing space after the value. Acceptable: Pico CSS collapses whitespace and the visual impact is negligible. If it matters, conditionally omit the `<small>` when `unit` is empty.
- **[Delta unit mismatch with value format]** → The value shows "1h 30m" but the delta shows "+15.0 min". This is intentional — the delta is a raw numeric change in minutes, and converting it to HM would require `Delta` component changes outside this change's scope. The "min" suffix makes the delta's unit explicit.
- **[Two StatCard implementations diverge further]** → The inline StatCard and the reusable one already differ. Adding `displayValue`/`deltaUnit` widens the gap slightly but follows the same pattern. A future refactor can consolidate them.

## Migration Plan

1. Add `displayValue` and `deltaUnit` props to the inline `StatCard` in `StatsChartsFragment.tsx`.
2. Update the avg-duration call site to use the new props.
3. Update test assertions in `stats-charts.test.tsx` and `navigation.test.tsx` to expect the formatted string as the value and no unit suffix.
4. Run `bun test` to verify.
5. **Rollback:** Revert the call site to `value={data.stats.avgDuration.value}` and `unit="min"`. No data or schema migration involved.

## Open Questions

None. The approach is fully determined by the existing `deltaUnit` pattern and Option A from the proposal.
