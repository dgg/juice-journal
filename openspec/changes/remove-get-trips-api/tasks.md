## 1. Remove `getTrips` function and clean `handlers.ts`

- [ ] 1.1 Remove the `getTrips` function (lines 35-70) from `src/backend/handlers.ts`
- [ ] 1.2 Remove unused imports: `displayTz`, `currentMonthBoundsUtc` from line 2, `Env` from line 5

## 2. Remove `getTrips` route from `index.ts`

- [ ] 2.1 Remove `getTrips` from the import on line 6 of `src/backend/index.ts`
- [ ] 2.2 Remove the `.get("/api/trips", getTrips)` route on line 61

## 3. Delete leftover test file

- [ ] 3.1 Delete `src/backend/handlers.test.ts` (the entire file only tested `getTrips`)

## 4. Verify build and tests

- [ ] 4.1 Run `bun run` to verify the server builds and starts
- [ ] 4.2 Run `bun test` to ensure no test breakage
- [ ] 4.3 Commit with `feat!: remove GET /api/trips endpoint`