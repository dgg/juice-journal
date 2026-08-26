## 1. Types & fetcher

- [x] 1.1 In `src/backend/weather/fetcher.ts`, delete `QUDT_UNITS`, `WeatherUnit`, and `WeatherReading`.
- [x] 1.2 Update `WeatherInfo` so `temperature`, `humidity`, `precipitation`, `wind.speed`, `wind.direction` are `number | null` with JSDoc comments documenting the unit (`DEG_C`, `PERCENT`, `MILLI-M`, `M-PER-SEC`, `DEG`).
- [x] 1.3 Rewrite `buildExcerpt` to emit plain `number | null` values (`hourly.<field>[picked.index] ?? null`) instead of `{ u, v }` envelopes. Confirm `WeatherSnapshot` still type-checks.

## 2. Storage & queries

- [x] 2.1 Verify `src/backend/weather/storage.ts` needs no change (it forwards `weather.start` / `weather.end` opaquely to `tripsQueries.updateWeather`); update only if types force it.
- [x] 2.2 Confirm `src/db/queries/trips.ts` `updateWeather(tripId, weatherStart, weatherEnd)` signature still accepts the new shape (`object | null`); no code change expected.

## 3. Tests

- [x] 3.1 In `src/backend/weather/fetch.test.ts`, replace `.u` / `.v` assertions with direct value assertions (e.g. `result.start!.temperature === 13.5`, `result.start!.wind.speed === 7`). Cover both `start` and `end`.
- [x] 3.2 Add a case asserting no `u` key exists on stored measurements (`expect((result.start!.temperature as any).u).toBeUndefined()` or equivalent) to lock the shape.
- [x] 3.3 Confirm `src/backend/weather/recorder.test.ts` still passes (it only checks null/not-null); no edits expected.
- [x] 3.4 Run `bun test` and ensure the full suite is green.

## 4. Verification & docs

- [x] 4.1 Run `bun test` (full suite) and `bun build`/typecheck if configured.
- [x] 4.2 Verify Docker build: `docker build .`.
- [x] 4.3 Grep for residual `WeatherReading`, `WeatherUnit`, `QUDT_UNITS`, and `.u)` / `: {v, u}` references across `src/` and confirm none remain.
- [x] 4.4 Commit with `refactor(weather): remove unit envelope from stored weather` (Conventional Commits), linking the relevant issue if any.