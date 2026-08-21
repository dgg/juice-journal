import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { fetchWeather } from "./fetch"

function makeForecastResponse(
	numLocs: number,
	slots: number,
	overrides: Partial<{
		time: string[]
		temperature_2m: (number | null)[]
		relative_humidity_2m: (number | null)[]
		precipitation: (number | null)[]
		wind_speed_10m: (number | null)[]
		wind_direction_10m: (number | null)[]
		weather_code: (number | null)[]
	}> = {}
) {
	const baseHour = Math.floor(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000
	const time: string[] = []
	const temps: (number | null)[] = []
	const hums: (number | null)[] = []
	const precips: (number | null)[] = []
	const wSpeeds: (number | null)[] = []
	const wDirs: (number | null)[] = []
	const codes: (number | null)[] = []

	for (let l = 0; l < numLocs; l++) {
		for (let s = 0; s < slots; s++) {
			const t = new Date(baseHour + s * 60 * 60 * 1000)
			time.push(t.toISOString().replace(/\.000Z$/, "Z"))
			temps.push(l === 0 ? 13.5 + s : 15.0 + s)
			hums.push(80 + s)
			precips.push(0.0)
			wSpeeds.push(l === 0 ? 7.0 + s : 5.0 + s)
			wDirs.push(240)
			codes.push(0)
		}
	}

	const base = {
		hourly: {
			time,
			temperature_2m: temps,
			relative_humidity_2m: hums,
			precipitation: precips,
			wind_speed_10m: wSpeeds,
			wind_direction_10m: wDirs,
			weather_code: codes
		}
	}

	if (overrides.time) base.hourly.time = overrides.time
	if (overrides.temperature_2m) base.hourly.temperature_2m = overrides.temperature_2m
	if (overrides.relative_humidity_2m) base.hourly.relative_humidity_2m = overrides.relative_humidity_2m
	if (overrides.precipitation) base.hourly.precipitation = overrides.precipitation
	if (overrides.wind_speed_10m) base.hourly.wind_speed_10m = overrides.wind_speed_10m
	if (overrides.wind_direction_10m) base.hourly.wind_direction_10m = overrides.wind_direction_10m
	if (overrides.weather_code) base.hourly.weather_code = overrides.weather_code

	return base
}

let originalFetch: any

beforeEach(() => {
	originalFetch = globalThis.fetch
})

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe("fetchWeather", () => {
	it("returns start and end snapshots for two-location forecast", async () => {
		const now = new Date()
		const startTime = new Date(now.getTime() - 45 * 60 * 1000).toISOString()
		const endTime = now.toISOString()

		const mockResponse = makeForecastResponse(2, 4)
		const mockFetch = async () =>
			new Response(JSON.stringify(mockResponse), { status: 200 })
		globalThis.fetch = mockFetch as any

		const result = await fetchWeather({
			locations: { startLat: 55.73, startLong: 9.62, endLat: 56.07, endLong: 10.01 },
			startTime,
			endTime
		})

		expect(result.start).toBeDefined()
		expect(result.end).toBeDefined()
		expect(result.start!.source).toBe("forecast")
		expect(result.end!.source).toBe("forecast")
		expect(result.start!.temperature.u).toBe("DEG_C")
		expect(result.end!.temperature.u).toBe("DEG_C")
		expect(result.start!.wind.speed.u).toBe("M-PER-SEC")
		expect(result.start!.observed_at).toBeTruthy()
		expect(result.start!.fetched_at).toBeTruthy()
	})

	it("returns start and end for one-location trip (same lat/long)", async () => {
		const now = new Date()
		const startTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
		const endTime = now.toISOString()

		const mockResponse = makeForecastResponse(1, 3)
		const mockFetch = async () =>
			new Response(JSON.stringify(mockResponse), { status: 200 })
		globalThis.fetch = mockFetch as any

		const result = await fetchWeather({
			locations: { startLat: 55.73, startLong: 9.62, endLat: 55.73, endLong: 9.62 },
			startTime,
			endTime
		})

		expect(result.start).toBeDefined()
		expect(result.end).toBeDefined()
	})

	it("uses archive endpoint for trips > 7 days old", async () => {
		const sevenDaysMs = 8 * 24 * 60 * 60 * 1000
		const endTime = new Date(Date.now() - sevenDaysMs).toISOString()
		const startTime = new Date(Date.now() - sevenDaysMs - 45 * 60 * 1000).toISOString()

		let calledUrl = ""
		const mockFetch = (url: string) => {
			calledUrl = url
			const mockResponse = makeForecastResponse(1, 3)
			return new Response(JSON.stringify(mockResponse), { status: 200 })
		}
		globalThis.fetch = mockFetch as any

		await fetchWeather({
			locations: { startLat: 55.73, startLong: 9.62, endLat: 56.07, endLong: 10.01 },
			startTime,
			endTime
		})

		expect(calledUrl).toContain("archive-api")
	})

	it("returns empty for null locations", async () => {
		const result = await fetchWeather({
			locations: { startLat: null, startLong: null, endLat: null, endLong: null },
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString()
		})

		expect(result.start).toBeUndefined()
		expect(result.end).toBeUndefined()
	})

	it("throws on HTTP 5xx", async () => {
		const mockFetch = async () => new Response("Server Error", { status: 500 })
		globalThis.fetch = mockFetch as any

		try {
			await fetchWeather({
				locations: { startLat: 55.73, startLong: 9.62, endLat: 56.07, endLong: 10.01 },
				startTime: new Date().toISOString(),
				endTime: new Date().toISOString()
			})
			expect.unreachable("should have thrown")
		} catch (err: unknown) {
			expect(err).toBeInstanceOf(Error)
			expect((err as Error).message).toContain("500")
		}
	})

	it("throws on network error", async () => {
		const mockFetch = async () => {
			throw new Error("net::ERR_CONNECTION_REFUSED")
		}
		globalThis.fetch = mockFetch as any

		try {
			await fetchWeather({
				locations: { startLat: 55.73, startLong: 9.62, endLat: 56.07, endLong: 10.01 },
				startTime: new Date().toISOString(),
				endTime: new Date().toISOString()
			})
			expect.unreachable("should have thrown")
		} catch (err: unknown) {
			expect(err).toBeInstanceOf(Error)
			expect((err as Error).message).toContain("ERR_CONNECTION_REFUSED")
		}
	})
})