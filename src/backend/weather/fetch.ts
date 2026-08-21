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

interface OpenMeteoHourlyResponse {
	time: string[]
	temperature_2m: (number | null)[]
	relative_humidity_2m: (number | null)[]
	precipitation: (number | null)[]
	wind_speed_10m: (number | null)[]
	wind_direction_10m: (number | null)[]
	weather_code: (number | null)[]
}

function extractSlice<T>(arr: T[], numLocations: number, locIndex: number, stride: number): T[] {
	const start = locIndex * stride
	return arr.slice(start, start + stride)
}

function buildSnapshot(
	timeSlice: string[],
	tempSlice: (number | null)[],
	humiditySlice: (number | null)[],
	precipSlice: (number | null)[],
	windSpeedSlice: (number | null)[],
	windDirSlice: (number | null)[],
	weatherCodeSlice: (number | null)[],
	targetTime: string,
	source: "forecast" | "historic",
	fetchedAt: string
): WeatherSnapshot | undefined {
	const idx = nearestBucket(timeSlice, targetTime)
	if (idx < 0) return undefined

	const observed = timeSlice[idx]
	if (!observed) return undefined

	return {
		source,
		observed_at: observed + (observed.endsWith("Z") ? "" : "Z"),
		fetched_at: fetchedAt,
		weather_code: weatherCodeSlice[idx] ?? 0,
		temperature: { v: tempSlice[idx] ?? 0, u: QUDT_UNITS.temperature },
		humidity: { v: humiditySlice[idx] ?? 0, u: QUDT_UNITS.humidity },
		precipitation: { v: precipSlice[idx] ?? 0, u: QUDT_UNITS.precipitation },
		wind: {
			speed: { v: windSpeedSlice[idx] ?? 0, u: QUDT_UNITS.windSpeed },
			direction: { v: windDirSlice[idx] ?? 0, u: QUDT_UNITS.windDirection }
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
	const isPresent = [false, false]

	if (locations.startLat != null && locations.startLong != null) {
		locLats.push(locations.startLat)
		locLongs.push(locations.startLong)
		isPresent[0] = true
	}
	if (locations.endLat != null && locations.endLong != null) {
		locLats.push(locations.endLat)
		locLongs.push(locations.endLong)
		isPresent[1] = true
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

	const body = (await response.json()) as {
		hourly: OpenMeteoHourlyResponse
	}

	const h = body.hourly
	if (!h || !h.time || h.time.length === 0) {
		return {}
	}

	const numTimeSlots = h.time.length
	const numLocations = locLats.length
	const stride = numTimeSlots / numLocations
	const fetchedAt = new Date().toISOString()

	const result: WeatherResult = {}

	for (let locIdx = 0; locIdx < numLocations; locIdx++) {
		const targetTime = locIdx === 0 ? startTime : endTime

		const snap = buildSnapshot(
			extractSlice(h.time, numLocations, locIdx, stride),
			extractSlice(h.temperature_2m, numLocations, locIdx, stride),
			extractSlice(h.relative_humidity_2m, numLocations, locIdx, stride),
			extractSlice(h.precipitation, numLocations, locIdx, stride),
			extractSlice(h.wind_speed_10m, numLocations, locIdx, stride),
			extractSlice(h.wind_direction_10m, numLocations, locIdx, stride),
			extractSlice(h.weather_code, numLocations, locIdx, stride),
			targetTime,
			source,
			fetchedAt
		)

		if (!snap) continue

		if (locIdx === 0) {
			result.start = snap
		} else {
			result.end = snap
		}
	}

	return result
}