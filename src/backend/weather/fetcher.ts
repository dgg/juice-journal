import { DateTime, Duration } from "luxon"
import { BucketPicker, type Bucket } from "./BucketPicker"
import { WeatherFetchError, WeatherParseError } from "./errors"

export interface WeatherLocation {
	latitude: number
	longitude: number
}

export interface WeatherParam {
	location: WeatherLocation
	time: DateTime
}

const MAX_FOR_FORECAST: Duration = Duration.fromObject({ days: 7 })

export abstract class ApiUrl {
	readonly #url: URL
	constructor(requestUrl: URL, start: WeatherParam, end: WeatherParam) {
		this.#url = requestUrl
		this.buildParams(start, end)
	}

	public get url() {
		return this.#url
	}

	public static build(
		start: WeatherParam,
		end: WeatherParam,
		alternativeHost?: string | URL
	): ApiUrl {
		const fromEnd: Duration = DateTime.utc().diff(end.time)
		if (fromEnd.toMillis() >= MAX_FOR_FORECAST.toMillis()) {
			return new ArchiveUrl(start, end, alternativeHost)
		}
		return new ForecastUrl(start, end, alternativeHost)
	}

	protected buildParams(start: WeatherParam, end: WeatherParam): void {
		this.#url.searchParams.set("timezone", "UTC")
		this.#url.searchParams.set(
			"latitude",
			`${start.location.latitude},${end.location.latitude}`
		)
		this.#url.searchParams.set(
			"longitude",
			`${start.location.longitude},${end.location.longitude}`
		)
		this.#url.searchParams.set(
			"hourly",
			"weather_code,temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
		)
		this.#url.searchParams.set("wind_speed_unit", "ms")
	}
}

class ArchiveUrl extends ApiUrl {
	constructor(start: WeatherParam, end: WeatherParam, alternativeHost?: string | URL) {
		const effectiveHost =
			alternativeHost ?? new URL("https://archive-api.open-meteo.com")

		var requestUrl = new URL("/v1/archive", effectiveHost)
		super(requestUrl, start, end)
	}

	protected override buildParams(start: WeatherParam, end: WeatherParam): void {
		super.buildParams(start, end)

		this.url.searchParams.set("start_date", start.time.toUTC().toFormat("yyyy-MM-dd"))
		this.url.searchParams.set("end_date", end.time.toUTC().toFormat("yyyy-MM-dd"))
	}
}

class ForecastUrl extends ApiUrl {
	constructor(start: WeatherParam, end: WeatherParam, alternativeHost?: string | URL) {
		const effectiveHost = alternativeHost ?? new URL("https://api.open-meteo.com")

		var requestUrl = new URL("/v1/forecast", effectiveHost)
		super(requestUrl, start, end)
	}

	protected override buildParams(start: WeatherParam, end: WeatherParam): void {
		super.buildParams(start, end)

		this.url.searchParams.set("forecast_days", "1")
		this.url.searchParams.set("models", "dmi_harmonie_arome_europe")
		// add one hour buffer to guarante that the bucket containing "start time" is present
		const hoursFromStart = DateTime.utc().diff(start.time, "hours").hours + 1
		const pastHours = Math.max(1, Math.ceil(hoursFromStart))
		this.url.searchParams.set("past_hours", pastHours.toString(10))
	}
}

export const QUDT_UNITS = {
	temperature: "DEG_C",
	humidity: "PERCENT",
	precipitation: "MILLI-M",
	windSpeed: "M-PER-SEC",
	windDirection: "DEG"
} as const

export type WeatherUnit = (typeof QUDT_UNITS)[keyof typeof QUDT_UNITS]

export interface WeatherReading {
	v: number | null
	u: WeatherUnit
}

interface ApiResponse {
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

export type WeatherSource = "forecast" | "archive"
export interface WeatherInfo {
	source: WeatherSource
	observedAt: DateTime
	fetchedAt: DateTime
	weatherCode: number | null
	temperature: WeatherReading
	humidity: WeatherReading
	precipitation: WeatherReading
	wind: {
		speed: WeatherReading
		direction: WeatherReading
	}
}

export interface WeatherResult {
	start: WeatherInfo
	end: WeatherInfo
}

type WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">

const buildExcerpt = (
	hourly: ApiResponse["hourly"],
	picked: Bucket
): WeatherSnapshot => ({
	humidity: {
		u: QUDT_UNITS.humidity,
		v: hourly.relative_humidity_2m[picked.index] ?? null
	},
	observedAt: picked.value,
	precipitation: {
		u: QUDT_UNITS.precipitation,
		v: hourly.precipitation[picked.index] ?? null
	},
	temperature: {
		u: QUDT_UNITS.temperature,
		v: hourly.temperature_2m[picked.index] ?? null
	},
	weatherCode: hourly.weather_code[picked.index] ?? null,
	wind: {
		direction: {
			u: QUDT_UNITS.windDirection,
			v: hourly.wind_direction_10m[picked.index] ?? null
		},
		speed: {
			u: QUDT_UNITS.windSpeed,
			v: hourly.wind_speed_10m[picked.index]?? null
		}
	}
})

export { WeatherFetchError }

export const fetchWeather = async (
	start: WeatherParam,
	end: WeatherParam
): Promise<WeatherResult> => {
	const apiUrl = ApiUrl.build(start, end)
	let response: Response
	try {
		response = await fetch(apiUrl.url)
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

	const json = (await response.json()) as ApiResponse[]
	if (!Array.isArray(json) || json.length !== 2) {
		throw new WeatherParseError("body is not an array with two items")
	}
	const fetchedAt = DateTime.utc()
	let source: WeatherSource = "forecast"
	if (apiUrl instanceof ArchiveUrl) {
		source = "archive"
	}
	const picker = new BucketPicker(json[0]!.hourly.time)
	const startBucket = picker.pick(start.time)
	const endBucket = picker.pick(end.time)

	const result: WeatherResult = {
		start: {
			...buildExcerpt(json[0]!.hourly, startBucket),
			fetchedAt,
			source
		},
		end: {
			...buildExcerpt(json[1]!.hourly, endBucket),
			fetchedAt,
			source
		}
	}
	return result
}
