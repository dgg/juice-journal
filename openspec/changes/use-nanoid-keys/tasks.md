## 1. Database Migration

- [ ] 1.1 Create dbmate migration file `db/migrations/<ts>_use_nanoid_keys.sql` with up and down sections
- [ ] 1.2 Up script: `CREATE EXTENSION IF NOT EXISTS nanoid;` (install `nanoid-postgres`)
- [ ] 1.3 Up script: drop the three FK constraints on `trips` (`trips_vehicle_id_fkey`, `trips_start_location_id_fkey`, `trips_end_location_id_fkey`)
- [ ] 1.4 Up script: alter `id` columns on `vehicles`, `locations`, `trips` from `UUID` to `TEXT`, set `DEFAULT nanoid(16)`
- [ ] 1.5 Up script: alter `vehicle_id`, `start_location_id`, `end_location_id` on `trips` from `UUID` to `TEXT`
- [ ] 1.6 Up script: recreate the three FK constraints on `trips`
- [ ] 1.7 Down script: reverse steps (drop FKs, alter back to `UUID DEFAULT gen_random_uuid()`, recreate FKs, drop extension) — document that existing nanoid rows are cleared
- [ ] 1.8 Run `bunx dbmate up` locally against docker-compose DB and verify columns are `TEXT` with nanoid default

## 2. Application Code

- [ ] 2.1 Update `src/backend/types.ts`: replace `z.uuid()` on `vehicle_id`, `start_location_id`, `end_location_id` with a 16-char nanoid string check (`z.string().length(16).regex(/^[A-Za-z0-9_-]{16}$/)`)
- [ ] 2.2 Verify `src/backend/validators.ts` needs no logic changes (IDs already flow as strings); remove any UUID-specific assumptions
- [ ] 2.3 Verify `src/backend/handlers.ts` inserts/returns IDs as-is with no UUID casting
- [ ] 2.4 Search codebase for any remaining `z.uuid()` or UUID-typed references on these fields and remove them

## 3. Verification

- [ ] 3.1 Run `bun test` and ensure existing tests pass (update test fixtures that use UUID-shaped IDs to use 16-char nanoid strings)
- [ ] 3.2 Manual smoke: `POST /api/trips` returns `201` with a 16-character nanoid `id`
- [ ] 3.3 Manual smoke: `GET /api/trips` returns trips with nanoid-shaped `id`, `vehicle_id`, and location IDs
- [ ] 3.4 Manual smoke: `POST /api/trips` with a UUID-shaped `vehicle_id` returns `400`
- [ ] 3.5 Verify `bunx dbmate down` then `bunx dbmate up` restores schema cleanly
