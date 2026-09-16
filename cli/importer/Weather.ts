import { DateTime } from "luxon"

interface WeatherRow {
	time: DateTime
	snapshot: WeatherSnapshot
}

const reducer = (
	weather: HistoricWeather,
	rows: WeatherRow[],
	ts: string,
	i: number
): WeatherRow[] => {
	const time = DateTime.fromISO(ts, {
		zone: "Europe/Copenhagen"
	})
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

	public static async load(filePath: string): Promise<Weather> {
		const fileContents = Bun.file(filePath)
		const weather = (await fileContents.json()) as HistoricWeather[]
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

export type Location = "home" | "work"

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
