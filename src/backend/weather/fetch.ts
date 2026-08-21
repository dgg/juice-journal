import { nearestBucket } from "./bucket-picker"
import {
	type WeatherSnapshot,
	type WeatherResult,
	type WeatherLocations,
	QUDT_UNITS,
	HOURLY_PARAMS
} from "./types"

const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast"
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive"
const MAX_DAYS_FOR_FORECAST = 7

export class WeatherFetchError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message)
		this.name = "WeatherFetchError"
	}
}

function hoursAgo(isoString: string): number {
	return (Date.now() - new Date(isoString).getTime()) / (60 * 60 * 1000)
}

function formatDate(isoString: string): string {
	const d = new Date(isoString)
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

function selectEndpoint(endTime: string): { base: string; source: "forecast" | "historic" } {
	const ageHours = hoursAgo(endTime)
	if (ageHours <= MAX_DAYS_FOR_FORECAST * 24) {
		return { base: FORECAST_BASE, source: "forecast" }
	}
	return { base: ARCHIVE_BASE, source: "historic" }
}

function buildParams(
	latitudes: number[],
	longitudes: number[],
	startTime: string,
	endTime: string,
	source: "forecast" | "historic"
): URLSearchParams {
	const params = new URLSearchParams()
	params.set("latitude", latitudes.join(","))
	params.set("longitude", longitudes.join(","))
	params.set("hourly", HOURLY_PARAMS)
	params.set("timezone", "UTC")

	if (source === "forecast") {
		const ageHours = hoursAgo(startTime)
		const pastHours = Math.max(1, Math.ceil(ageHours) + 1)
		params.set("past_hours", String(pastHours))
		params.set("forecast_days", "1")
		params.set("models", "dmi_harmonie_arome_europe")
		params.set("wind_speed_unit", "ms")
	} else {
		const date = formatDate(endTime)
		params.set("start_date", date)
		params.set("end_date", date)
		params.set("wind_speed_unit", "ms")
	}

	return params
}

interface OpenMeteoLocationResponse {
	hourly: {
		time: string[]
		temperature_2m: (number | null)[]
		relative_humidity_2m: (number | null)[]
		precipitation: (number | null)[]
		wind_speed_10m: (number | null)[]
		wind_direction_10m: (number | null)[]
		weather_code: (number | null)[]
	}
}

function buildSnapshot(
	h: OpenMeteoLocationResponse["hourly"],
	targetTime: string,
	source: "forecast" | "historic",
	fetchedAt: string
): WeatherSnapshot | undefined {
	const idx = nearestBucket(h.time, targetTime)
	if (idx < 0) return undefined

	const observed = h.time[idx]
	if (!observed) return undefined

	return {
		source,
		observed_at: observed + (observed.endsWith("Z") ? "" : "Z"),
		fetched_at: fetchedAt,
		weather_code: h.weather_code[idx] ?? 0,
		temperature: { v: h.temperature_2m[idx] ?? 0, u: QUDT_UNITS.temperature },
		humidity: { v: h.relative_humidity_2m[idx] ?? 0, u: QUDT_UNITS.humidity },
		precipitation: { v: h.precipitation[idx] ?? 0, u: QUDT_UNITS.precipitation },
		wind: {
			speed: { v: h.wind_speed_10m[idx] ?? 0, u: QUDT_UNITS.windSpeed },
			direction: { v: h.wind_direction_10m[idx] ?? 0, u: QUDT_UNITS.windDirection }
		}
	}
}

export async function fetchWeather(params: {
	locations: WeatherLocations
	startTime: string
	endTime: string
}): Promise<WeatherResult> {
	const { locations, startTime, endTime } = params

	const locLats: number[] = []
	const locLongs: number[] = []

	if (locations.startLat != null && locations.startLong != null) {
		locLats.push(locations.startLat)
		locLongs.push(locations.startLong)
	}
	if (locations.endLat != null && locations.endLong != null) {
		const isSame =
			locLats.length > 0 &&
			locations.startLat === locations.endLat &&
			locations.startLong === locations.endLong
		if (!isSame) {
			locLats.push(locations.endLat)
			locLongs.push(locations.endLong)
		}
	}

	if (locLats.length === 0) {
		return {}
	}

	const { base, source } = selectEndpoint(endTime)
	const queryParams = buildParams(locLats, locLongs, startTime, endTime, source)
	const url = `${base}?${queryParams.toString()}`

	let response: Response
	try {
		response = await fetch(url)
	} catch (err) {
		throw new WeatherFetchError(
			err instanceof Error ? err.message : "Network error fetching weather"
		)
	}

	if (!response.ok) {
		throw new WeatherFetchError(
			`Open-Meteo returned ${response.status}: ${response.statusText}`,
			response.status
		)
	}

	const body = (await response.json()) as OpenMeteoLocationResponse[]
	if (!Array.isArray(body) || body.length === 0) {
		return {}
	}

	const fetchedAt = new Date().toISOString()
	const result: WeatherResult = {}

	if (body.length === 1) {
		const loc = body[0]
		if (!loc) return {}
		const h = loc.hourly
		if (!h?.time?.length) return {}
		result.start = buildSnapshot(h, startTime, source, fetchedAt)
		result.end = buildSnapshot(h, endTime, source, fetchedAt)
	} else {
		const loc0 = body[0]
		if (loc0?.hourly?.time?.length) {
			result.start = buildSnapshot(loc0.hourly, startTime, source, fetchedAt)
		}
		const loc1 = body[1]
		if (loc1?.hourly?.time?.length) {
			result.end = buildSnapshot(loc1.hourly, endTime, source, fetchedAt)
		}
	}

	return result
}