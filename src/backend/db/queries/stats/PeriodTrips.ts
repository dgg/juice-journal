import type { SQL } from "bun"
import type { DateTime } from "luxon"

import { fromUtcDateTime, toNumber, toUtcDateTime } from "../../convert"
import type { TripRow } from "./types"

import { DbQuery } from "../DbQuery"


export type StatTrip = Pick<TripRow, "daypart" | "duration"> & {
	time: DateTime
	distance: number
	speed: number | null
	consumption: number | null
}

export class PeriodTrips extends DbQuery<TripRow, StatTrip[]> {
	constructor(
		private readonly vehicleId: string,
		private readonly startUtc: DateTime,
		private readonly endUtc: DateTime
	) {
		super()
	}

	protected override mapResults(rows: TripRow[]): StatTrip[] {
		const trips: StatTrip[] = rows.map(({ daypart, duration, ...r }) => ({
			daypart,
			duration,
			consumption: toNumber(r.consumption),
			distance: toNumber(r.distance)!,
			speed: toNumber(r.speed),
			time: toUtcDateTime(r.end_time)
		}))
		return trips
	}

	protected async doQuery(db: SQL): Promise<TripRow[]> {
		const rows: TripRow[] = await db`
				SELECT
					trips.end_time,
					trips.daypart,
					distance,
					duration,
					speed,
					consumption
				FROM trips
				WHERE end_time >= ${fromUtcDateTime(this.startUtc)}
					AND end_time < ${fromUtcDateTime(this.endUtc)}
					AND vehicle_id = ${this.vehicleId}
				ORDER BY end_time ASC
			`
		return rows
	}
}
