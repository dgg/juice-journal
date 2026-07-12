## Context

The `vehicles`, `locations`, and `trips` tables use 36-character UUIDs as primary keys, defaulted by Postgres `gen_random_uuid()`. Foreign keys on `trips` (`vehicle_id`, `start_location_id`, `end_location_id`) are `UUID` columns referencing these tables. Application code in `src/backend/types.ts` validates these fields with `z.uuid()` and treats them as UUID-typed strings end-to-end. There is no production data — the migration is pre-launch, so dev-data clearing is an acceptable backfill strategy.

The `nanoid-postgres` extension (https://github.com/viascom/nanoid-postgres) exposes a SQL `nanoid(length)` function that generates URL-safe random IDs inside Postgres. This keeps ID generation server-side (application code never assigns IDs) while producing short, 16-character identifiers.

## Goals / Non-Goals

**Goals:**
- Replace UUID primary keys on `vehicles`, `locations`, `trips` with 16-char nanoid generated in Postgres.
- Keep ID generation database-side — application code continues to rely on `DEFAULT` and never sets `id`.
- Update the Zod schema and validators to accept the new ID format.
- Provide a reversible dbmate migration with extension install + column type changes.

**Non-Goals:**
- Changing non-key columns or the `UNIQUE(vehicle_id, end_time)` constraint semantics.
- Migrating existing UUID values to nanoid (dev data will be cleared; there is no production data).
- Adding nanoid generation to the JavaScript layer — generation stays in Postgres.
- Exposing the nanoid alphabet/length as a runtime config value (hardcoded `nanoid(16)`).

## Decisions

### Decision: Use `TEXT` not `UUID` for nanoid columns

nanoid produces URL-safe strings (e.g. `V1StGXR8_Z5jdHi6B-mBw`), which are not valid UUIDs. Columns must be `TEXT` (or `VARCHAR(16)`). We choose `TEXT` over `VARCHAR(16)` to avoid a fixed-length constraint that would need future migration if the nanoid length changes, and because Postgres treats them identically for indexing.

**Alternatives considered:**
- `VARCHAR(16)`: saves a few bytes per row on disk; rejected because the length is an implementation detail and Postgres stores `TEXT`/`VARCHAR` identically anyway.

### Decision: 16 characters

16 chars of the nanoid alphabet (default 64 symbols) gives ~2^96 collision space — effectively unbounded for a personal-trip-tracking dataset. 16 is short enough for logs/URLs, long enough to never collide.

### Decision: Generate via `nanoid-postgres` extension, not application code

The current design has Postgres default the key (`DEFAULT gen_random_uuid()`). To preserve "insert paths unchanged" (handlers never set `id`), we keep generation in Postgres by switching the default to `nanoid(16)`. This requires the `nanoid-postgres` extension to be installed in the database.

**Alternatives considered:**
- Generate nanoid in Bun (e.g. `nanoid` npm package): would move ID assignment into the application, changing every insert path and violating the "DB-generated keys" constraint in AGENTS.md (`continue with db-generated identifiers`). Rejected.
- Use `pgcrypto`'s `gen_random_bytes` + custom encoding: reinvents nanoid; rejected in favor of the maintained extension.

### Decision: Column type changed via `ALTER TABLE`, FKs dropped and recreated

Postgres cannot directly convert `UUID` → `TEXT` while data is present, and the existing UUID values are not castable to nanoid. Since there is no production data, the migration:
1. Installs `nanoid-postgres` extension.
2. Drops the FK constraints on `trips`.
3. Alters all key columns (`id` on all three tables; the three FK columns on `trips`) from `UUID` to `TEXT`.
4. Sets `DEFAULT nanoid(16)` on the three `id` columns.
5. Recreates the FK constraints.

The down migration reverses these steps (extension dropped, columns reverted to `UUID DEFAULT gen_random_uuid()`, FKs recreated). Down migration is destructive — nanoid text values are not castable back to UUID.

### Decision: Zod schema uses a custom 16-char string check

Replace `z.uuid()` for `vehicle_id`, `start_location_id`, `end_location_id` with `z.string().length(16).nanoid()` (or `.regex(/^[A-Za-z0-9_-]{16}$/)` if the `nanoid` refinement is unavailable). This rejects malformed IDs at the schema layer before the FK check runs.

## Risks / Trade-offs

- **Extension availability**: `nanoid-postgres` must be installed in the hosted Postgres. If the provider disallows custom extensions, the migration fails. → Mitigation: verify extension install in a throwaway migration first; the design assumes `CREATE EXTENSION` privileges exist.
- **Rollback loses data**: nanoid strings cannot be cast back to UUID. → Mitigation: this is pre-launch with no production data; down migration documents that it clears dev data.
- **Schema validation strictness**: a 16-char regex is looser than a true nanoid alphabet check (e.g. it allows `---___---___---_`). → Mitigation: acceptable — the DB enforces the real format on insert via `DEFAULT nanoid(16)`, and the regex only filters client garbage.
- **Breaking API contract**: clients sending UUID-shaped IDs get `400`. → Mitigation: documented as BREAKING in the proposal; no external clients exist yet.

## Migration Plan

1. Branch: `feat/use-nanoid-keys`.
2. Add dbmate migration `db/migrations/<ts>_use_nanoid_keys.sql` (up/down per Decision above).
3. Update `src/backend/types.ts`: replace `z.uuid()` with the nanoid string check.
4. Update `src/backend/validators.ts` and `src/backend/handlers.ts`: no logic changes needed (IDs already flow as strings), but verify no UUID-specific casts remain.
5. Run `bunx dbmate up` locally against the docker-compose DB.
6. Run `bun test`.
7. Manual smoke: `POST /api/trips` returns a 16-char `id`; `GET /api/trips` returns nanoid-shaped IDs.

**Rollback**: `bunx dbmate down` (clears dev data), revert code via git.
