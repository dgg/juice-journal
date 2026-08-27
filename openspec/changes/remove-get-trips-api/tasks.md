## 1. Remove `getTrips` function and clean `handlers.ts`

- [x] 1.1 Remove the `getTrips` function (lines 35-70) from `src/backend/handlers.ts`
- [x] 1.2 Remove unused imports: `displayTz`, `currentMonthBoundsUtc` from line 2, `Env` from line 5

## 2. Remove `getTrips` route from `index.ts`

- [x] 2.1 Remove `getTrips` from the import on line 6 of `src/backend/index.ts`
- [x] 2.2 Remove the `.get("/api/trips", getTrips)` route on line 61

## 3. Delete leftover test file

- [x] 3.1 Delete `src/backend/handlers.test.ts` (the entire file only tested `getTrips`)

## 4. Verify build and tests

- [x] 4.1 Verify the server builds and starts
- [x] 4.2 Run `bun test` to ensure no test breakage
- [ ] 4.3 Commit with `feat!: remove GET /api/trips endpoint`