## Context

See `proposal.md` — Why. Today `src/backend/weather/fetcher.ts` defines `QUDT_UNITS` (a const map of field → QUDT unit string), `WeatherUnit` (its union of values), and `WeatherReading = { v: number | null; u: WeatherUnit }`. `WeatherInfo` uses `WeatherReading` for `temperature`, `humidity`, `precipitation`, `wind.speed`, `wind.direction`; `buildExcerpt` builds each reading as `{ u: QUDT_UNITS.<field>, v: <api value> ?? null }`. The result is persisted verbatim into `trips.weather_start` / `weather_end` (JSONB) by `tripsQueries.updateWeather` and the create path. `fetch.test.ts` asserts `result.start.temperature.u === "DEG_C"` etc. No frontend reads the units today; the only consumers are the test and the storage layer. The existing `trip-weather` spec's "Weather storage shape" requirement mandates the `{v, u}` envelope.

## Goals / Non-Goals

**Goals:**

- Store each measurement as a plain `number | null`; carry units as JSDoc on the type, not in the payload.
- Keep the fetch/retry/storage pipeline behavior identical except for the shape.

**Non-Goals:**

- Changing which fields are recorded, the Open-Meteo request, bucket selection, or retry semantics (those are stable requirements in `trip-weather`).
- Surfacing units in any frontend/API response field name (no `temperature_c`).
- Backfilling weather for trips that currently have `NULL` weather.

## Decisions

### Decision 1: Plain `number | null` on the type, units as JSDoc

Replace `WeatherReading` with the primitive directly on `WeatherInfo`:

```ts
export interface WeatherInfo {
	source: WeatherSource
	observedAt: DateTime
	fetchedAt: DateTime
	weatherCode: number | null
	/** degrees Celsius (QUDT DEG_C) */
	temperature: number | null
	/** percent (QUDT PERCENT) */
	humidity: number | null
	/** millimetres (QUDT MILLI-M) */
	precipitation: number | null
	wind: {
		/** metres per second (QUDT M-PER-SEC) */
		speed: number | null
		/** degrees, 0–360 (QUDT DEG) */
		direction: number | null
	}
}
```

Delete `QUDT_UNITS`, `WeatherUnit`, and `WeatherReading`.

**Alternatives considered:**
- Units in field names (`temperature_c`, `wind_speed_ms`): rejected — renames ripple into the stored JSONB keys (another migration) and the spec's shape; the user explicitly asked for units as type comments, not field names.
- Keep `WeatherReading` but drop `u` (`{ v: number | null }`): rejected — a single-field object is pure noise; `number | null` is the point.

### Decision 2: `buildExcerpt` emits primitives

`buildExcerpt` returns `temperature: hourly.temperature_2m[picked.index] ?? null` directly (and likewise for the other fields). `WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">` still holds.

### Decision 3: Test updates

`fetch.test.ts` currently asserts `.u` and (implicitly) `.v`. Update to assert the flat values directly: `result.start.temperature === 13.5`, `result.start.wind.speed === 7`. `recorder.test.ts` only checks null/not-null on `weather_start`/`weather_end`, so no shape change needed there.

## Risks / Trade-offs

- **[Breaking API shape]** `GET/POST /api/trips` returns flat measurements instead of `{v, u}`. → Accepted; this is an internal-only API for a personal tracker and the change is explicit in the proposal. No external consumer contract to honor.
- **[Loss of per-value provenance]** A future fetcher change (e.g. switching `wind_speed_unit=kmh`) could silently change the meaning of stored `wind.speed` values with no in-payload signal. → Mitigated by the type JSDoc and by `ApiUrl.buildParams` already pinning `wind_speed_unit=ms`; any unit change would require a coordinated type update, which is the right friction.

## Open Questions

None.