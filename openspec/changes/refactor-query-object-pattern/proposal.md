## Why

Database access is currently scattered across handlers and validators as inline tagged-template SQL against the third-party `postgres` package. SQL strings, row projection (e.g. `NUMERIC` → `number` via `asNumber`), and typed output shapes are duplicated in every caller and embedded in HTTP-layer code. This makes queries hard to test in isolation, hides data-access complexity in handlers, and couples the project to an external dependency when Bun ships a built-in SQL client. Extracting queries into a query-object pattern centralizes SQL, typing, and row conversion behind a single import per domain, and dropping `postgres` removes a dependency the project doesn't need.

## What Changes

- Introduce a **query object pattern**: one module per domain (`trips`, `vehicles`, `locations`, `stats`) under `src/db/queries/`, each exporting typed query methods that take parameters as arguments and return typed objects.
- Each query object is responsible for the full database interaction: executing SQL, projecting/parsing rows (e.g. `NUMERIC` string → `number`, `TIMESTAMPTZ` → typed date), and returning strongly-typed results. The exported types become the single source of truth for query return shapes.
- Replace the `postgres` package with Bun's built-in `Bun.sql` SQL client (`src/db/client.ts` becomes a thin `Bun.sql` wrapper/export).
- **BREAKING (internal)**: Remove the `postgres` runtime dependency from `package.json`; the `db` tagged-template helper is no longer exported. All callers (`handlers.ts`, `home.ts`, `validators.ts`) import the new query objects instead of writing inline SQL.
- Remove duplicated row-mapping logic (the `asNumber` helper and repeated `trip → object` projections move into the query objects).
- No public API endpoints, request/response contracts, or HTTP behavior change. No database schema changes.

## Capabilities

### New Capabilities

None. This is an internal refactor; no new externally-observable behavior is introduced.

### Modified Capabilities

None. Existing capabilities (`trips-api`, `home-page-ssr`, `request-validation`) keep their current requirements — only the internal data-access implementation backing them changes.

> This change is a pure refactor with no spec-level behavior changes. The change's `.openspec.yaml` sets `skip_specs: true`.

## Impact

- **Code**: `src/db/client.ts` (rewrite to `Bun.sql`), new `src/db/queries/*.ts` modules, `src/backend/handlers.ts`, `src/backend/home.ts`, `src/backend/validators.ts` (consume query objects, drop inline SQL).
- **Dependencies**: Remove `postgres` (`package.json`); rely on `Bun.sql` (built-in).
- **Types**: Query return types currently ad-hoc in `types.ts`/`home.ts` move to and are exported from the query modules.
- **Tests**: Existing `bun test` suites (`handlers.test.ts`, `home.test.ts`, `validators.test.ts`) must continue to pass; new unit tests cover query object projection/parsing against a live or mocked DB.

## Rollback Plan

- The change is contained to the data-access layer and three backend files; revert the commits to restore the `postgres`-based inline-SQL implementation.
- Re-add the `postgres` dependency (`bun install postgres`) and restore `src/db/client.ts` from git history.
- No database migrations are touched, so rollback requires no DDL changes or data migration.
