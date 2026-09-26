import type { WeatherSnapshot } from "../../../weather/types"
import { DbQuery } from "../DbQuery"

export class UpdateWeather extends DbQuery<void, void> {
	constructor(
		private readonly id: string,
		private readonly start: WeatherSnapshot,
		private readonly end: WeatherSnapshot
	) {
		super()
	}
	protected override mapResults(_: void[]): void {
		return
	}

	protected override async doQuery(db: Bun.SQL): Promise<void[]> {
		await db`
			UPDATE trips SET
				weather_start = ${this.start},
				weather_end = ${this.end},
				tracking_updated = now()
			WHERE id = ${this.id}
		`
		return []
	}
}
