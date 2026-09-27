import type { Daypart, Location } from "../../../types"
import type { WeatherSnapshot } from "../../../weather/types"

import { DbQuery } from "../DbQuery"
import { fromUtcDateTime, toNumber, toUtcDateTime } from "../../convert"

import type { TripSnapshot } from "./FindTrips"

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

export class FindById extends DbQuery<TripRow, TripSnapshot | null> {
	constructor(private readonly tripId: string) {
		super()
	}

	protected override mapResults(rows: TripRow[]): TripSnapshot | null {
		if (rows.length === 0) return null
		const { id, daypart, duration, start_location, end_location, weather_start, ...r } =
			rows[0]!
		return {
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
		}
	}

	protected override async doQuery(db: Bun.SQL): Promise<TripRow[]> {
		const rows: TripRow[] = await db`
			SELECT
				id,
				start_time,
				end_time,
				daypart,
				duration,
				distance,
				speed,
				consumption,
				odometer,
				start_location,
				end_location,
				weather_start
			FROM trips
			WHERE id = ${this.tripId}
		`
		return rows
	}
}