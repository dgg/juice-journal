import { DateTime } from "luxon"

export type Location = "home" | "work"

export interface WeatherSnapshot {
	observedAt: DateTime
	weatherCode: number | null
	temperature: number | null
	humidity: number | null
	precipitation: number | null
	wind: {
		speed: number | null
		direction: number | null
	}
}

interface WeatherRow {
	time: DateTime
	snapshot: WeatherSnapshot
}

interface HistoricWeather {
	hourly: {
		time: string[]
		temperature_2m: number[]
		relative_humidity_2m: number[]
		precipitation: number[]
		weather_code: number[]
		wind_speed_10m: number[]
		wind_direction_10m: number[]
	}
}

const reducer = (
	weather: HistoricWeather,
	rows: WeatherRow[],
	ts: string,
	i: number
): WeatherRow[] => {
	const time = DateTime.fromISO(ts, { zone: "UTC" })
	const snapshot: WeatherSnapshot = {
		humidity: weather.hourly.relative_humidity_2m[i]!,
		observedAt: time,
		precipitation: weather.hourly.precipitation[i]!,
		temperature: weather.hourly.temperature_2m[i]!,
		weatherCode: weather.hourly.weather_code[i]!,
		wind: {
			direction: weather.hourly.wind_direction_10m[i]!,
			speed: weather.hourly.wind_speed_10m[i]!
		}
	}
	rows.push({ time, snapshot })

	return rows
}



export interface Bucket {
	index: number
	value: DateTime
}

class RowChoice {
	public readonly row: WeatherRow
	public readonly diff: number
	constructor(row: WeatherRow, targetMs: number) {
		this.row = row
		this.diff = Math.abs(row.time.toMillis() - targetMs)
	}

	public lessThan(other: RowChoice): boolean {
		return this.diff < other.diff
	}

	public asSnapshot(): WeatherSnapshot {
		return this.row.snapshot
	}
}

export class Weather {
	readonly #home: WeatherRow[]
	readonly #work: WeatherRow[]
	private constructor(home: WeatherRow[], work: WeatherRow[]) {
		this.#home = home
		this.#work = work
	}

	public getWeather(location: Location, when: DateTime): WeatherSnapshot {
		const rows = location === "home" ? this.#home : this.#work

		const targetMs = when.toMillis()

		let best = new RowChoice(rows[0]!, targetMs)
		for (let i = 1; i < rows.length; i++) {
			const current = new RowChoice(rows[i]!, targetMs)
			if (current.lessThan(best)) {
				best = current
			} else {
				break
			}
		}

		return best.asSnapshot()
	}

	public static async fetch(from: DateTime, to: DateTime): Promise<Weather> {
		const [homeLat, homeLng] = process.env.HOME_LATLNG!.split(",")
		const [workLat, workLng] = process.env.WORK_LATLNG!.split(",")

		const host = new URL("https://historical-forecast-api.open-meteo.com")
		const requestUrl = new URL("/v1/forecast", host)
		requestUrl.searchParams.set("timezone", "UTC")
		requestUrl.searchParams.set("latitude", `${homeLat},${workLat}`)
		requestUrl.searchParams.set("longitude", `${homeLng},${workLng}`)
		requestUrl.searchParams.set(
			"hourly",
			"weather_code,temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
		)
		requestUrl.searchParams.set("wind_speed_unit", "ms")
		requestUrl.searchParams.set("start_date", from.toUTC().toFormat("yyyy-MM-dd"))
		requestUrl.searchParams.set("end_date", to.toUTC().toFormat("yyyy-MM-dd"))
		requestUrl.searchParams.set("models", "dmi_harmonie_arome_europe")

		const response = await fetch(requestUrl)
		if (!response.ok) {
			throw new Error(
				`Weather API returned ${response.status}: ${response.statusText}`
			)
		}

		const weather = (await response.json()) as HistoricWeather[]

		const homeRows: WeatherRow[] = weather[0]!.hourly.time.reduce(
			(rows, ts, i) => reducer(weather[0]!, rows, ts, i),
			[] as WeatherRow[]
		)
		const workRows: WeatherRow[] = weather[1]!.hourly.time.reduce(
			(rows, ts, i) => reducer(weather[1]!, rows, ts, i),
			[] as WeatherRow[]
		)

		return new Weather(homeRows, workRows)
	}
}
