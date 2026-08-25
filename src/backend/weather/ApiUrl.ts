import { Duration, DateTime } from "luxon"
import { MAX_FOR_FORECAST } from "./fetcher"
import type { WeatherParam, WeatherSource } from "./types"

export abstract class ApiUrl {
	readonly #url: URL
	constructor(requestUrl: URL, start: WeatherParam, end: WeatherParam) {
		this.#url = requestUrl
		this.buildParams(start, end)
	}

	public get url(): URL {
		return this.#url
	}

	public get source() : WeatherSource {
		let s: WeatherSource = "forecast"
		if (this instanceof ArchiveUrl) {
			s = "archive"
		}
		return s
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
