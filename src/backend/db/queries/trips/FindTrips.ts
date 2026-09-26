import type { DateTime } from "luxon"
import type { Daypart, Location } from "../../../types"
import type { WeatherSnapshot } from "../../../weather/types"

import { DbQuery } from "../DbQuery"
import { fromUtcDateTime, toNumber, toUtcDateTime } from "../../convert"

interface TripRow {
	id: string
	start_time: Date
	end_time: Date
	daypart: Daypart
	duration: number
	distance: string
	speed: string | null
	consumption: string | null
	odometer: string | null
	start_location: Location
	end_location: Location
	weather_start: WeatherSnapshot | null
}

export type TripSnapshot = Pick<
	TripRow,
	| "id"
	| "daypart"
	| "duration"
	| "start_location"
	| "end_location"
	| "weather_start"
> & {
	start_time: DateTime
	end_time: DateTime
	distance: number,
	speed: number | null
	consumption: number | null
	odometer: number | null
}

export class FindTrips extends DbQuery<TripRow, TripSnapshot[]> {
	/**
	 *
	 */
	constructor(
		private readonly startUtc: DateTime,
		private readonly endUtc: DateTime,
		private readonly vehicleId: string
	) {
		super()
	}

	protected override mapResults(rows: TripRow[]): TripSnapshot[] {
		const snapthots: TripSnapshot[] = rows.map(
			({
				id,
				daypart,
				duration,
				start_location,
				end_location,
				weather_start,
				...r
			}) => ({
				id,
				daypart,
				duration,
				start_location,
				end_location,
				weather_start,
				consumption: toNumber(r.consumption),
				distance: toNumber(r.distance)!,
				end_time: toUtcDateTime(r.end_time),
				odometer: toNumber(r.odometer),
				speed: toNumber(r.speed),
				start_time: toUtcDateTime(r.start_time)
			})
		)

		return snapthots
	}

	protected override async doQuery(db: Bun.SQL): Promise<TripRow[]> {
		const rows: TripRow[] = await db`
			SELECT
				t.id,
				t.start_time,
				t.end_time,
				t.daypart,
				t.duration,
				t.distance,
				t.speed,
				t.consumption,
				t.odometer,
				t.weather_start,
				t.start_location,
				t.end_location
			FROM trips t
			WHERE t.end_time >= ${fromUtcDateTime(this.startUtc)}
				AND t.end_time < ${fromUtcDateTime(this.endUtc)}
				AND t.vehicle_id = ${this.vehicleId}
			ORDER BY t.end_time DESC
		`
		return rows
	}
}
