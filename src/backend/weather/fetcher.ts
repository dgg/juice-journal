import { DateTime, Duration } from "luxon"
import { BucketPicker, type Bucket } from "./BucketPicker"
import { WeatherFetchError, WeatherParseError } from "./errors"
import type { WeatherParam, WeatherSource } from "./types"
import { ApiUrl } from "./ApiUrl"

export const MAX_FOR_FORECAST: Duration = Duration.fromObject({ days: 7 })

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

export interface WeatherInfo {
	source: WeatherSource
	observedAt: DateTime
	fetchedAt: DateTime
	weatherCode: number | null
	/** DEG_C */
	temperature: number | null
	/** PERCENT */
	humidity: number | null
	/** MILLI-M */
	precipitation: number | null
	wind: {
		/** M-PER-SEC */
		speed: number | null
		/** QUDT DEG */
		direction: number | null
	}
}

export interface TripWeather {
	start: WeatherInfo
	end: WeatherInfo
}

type WeatherSnapshot = Omit<WeatherInfo, "fetchedAt" | "source">

const buildExcerpt = (
	hourly: ApiResponse["hourly"],
	picked: Bucket
): WeatherSnapshot => ({
	humidity: hourly.relative_humidity_2m[picked.index] ?? null,
	observedAt: picked.value,
	precipitation: hourly.precipitation[picked.index] ?? null,
	temperature: hourly.temperature_2m[picked.index] ?? null,
	weatherCode: hourly.weather_code[picked.index] ?? null,
	wind: {
		direction: hourly.wind_direction_10m[picked.index] ?? null,
		speed: hourly.wind_speed_10m[picked.index] ?? null
	}
})

export { WeatherFetchError }

export const fetchWeather = async (
	start: WeatherParam,
	end: WeatherParam
): Promise<TripWeather> => {
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

	const picker = new BucketPicker(json[0]!.hourly.time)
	const startBucket = picker.pick(start.time)
	const endBucket = picker.pick(end.time)

	const result: TripWeather = {
		start: {
			...buildExcerpt(json[0]!.hourly, startBucket),
			fetchedAt,
			source: apiUrl.source
		},
		end: {
			...buildExcerpt(json[1]!.hourly, endBucket),
			fetchedAt,
			source: apiUrl.source
		}
	}
	return result
}
