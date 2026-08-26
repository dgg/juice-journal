## Why

Stored weather readings carry their QUDT unit strings alongside every value (`{v: 13.5, u: "DEG_C"}`). The units are fixed per field and never vary at runtime — `temperature` is always `DEG_C`, `wind.speed` always `M-PER-SEC`, etc. — so the `u` envelope is dead weight in the JSONB payload and a noisy indirection in the TypeScript types (`WeatherReading`, `WeatherUnit`, `QUDT_UNITS`). Dropping the envelope shrinks storage, simplifies the type surface, and leaves the units as documentation on the field type where they belong.

## What Changes

- **BREAKING**: The stored weather JSONB shape changes. Each measurement field becomes a plain `number | null` instead of `{v: number | null, u: string}`. `temperature: {v: 13.5, u: "DEG_C"}` → `temperature: number | null` (with the unit documented as a JSDoc comment on the type).
- Remove `WeatherReading`, `WeatherUnit`, and `QUDT_UNITS` from `src/backend/weather/fetcher.ts`.
- Update `buildExcerpt` to emit plain `number | null` values.
- Update `WeatherInfo` / `TripWeather` interfaces so measurements are `number | null` with unit documentation as comments.
- Update `fetch.test.ts` assertions that read `.u` / `.v`.
- No database migration: development data has already been purged, so existing `weather_start` / `weather_end` rows need no rewriting.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-weather`: The "Weather storage shape" requirement changes — measurements are stored as plain `number | null` rather than `{v, u}` envelopes; units are documented on the type, not carried in the payload.

## Impact

- **Code**: `src/backend/weather/fetcher.ts` (type removal + `buildExcerpt`), `src/backend/weather/fetch.test.ts` (assertions), `src/backend/weather/recorder.test.ts` (any shape assertions).
- **Database**: None. Development data has already been purged; no migration needed. The `weather_start` / `weather_end` JSONB columns keep their existing definition.
- **API**: `GET/POST /api/trips` returns the weather fields in the new flat shape — a breaking change for any consumer relying on `{v, u}`.
- **Rollback**: Revert the code change. No data to restore (existing rows were purged).