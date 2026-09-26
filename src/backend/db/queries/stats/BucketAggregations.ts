import type { SQL } from "bun"
import { DateTime } from "luxon"

import { toUtcDateTime, fromUtcDateTime, toNumber } from "../../convert"

import type { TripRow } from "./types"

import { DbQuery } from "../DbQuery"

type BucketRow = Pick<TripRow, "distance" | "speed" | "consumption"> & {
	bucket_start: Date
	duration: string // aggregated (SUM) -> not an integer
	speed: string | null
	consumption: string | null
}

export interface BucketedStats {
	time: DateTime
	distance: number
	duration: number
	speed: number | null
	consumption: number | null
}

export type PeriodBucket = "day" | "week" | "month"

export class BucketAggregations extends DbQuery<BucketRow, BucketedStats[]> {
	constructor(
		private readonly vehicleId: string,
		private readonly startUtc: DateTime,
		private readonly endUtc: DateTime,
		private readonly bucket: PeriodBucket
	) {
		super()
	}

	protected override mapResults(rows: BucketRow[]): BucketedStats[] {
		const aggregations: BucketedStats[] = rows.map((r) => ({
			time: toUtcDateTime(r.bucket_start),
			distance: toNumber(r.distance)!,
			duration: toNumber(r.duration)!,
			speed: toNumber(r.speed),
			consumption: toNumber(r.consumption)
		}))
		return aggregations
	}

	protected async doQuery(db: SQL): Promise<BucketRow[]> {
		const rows: BucketRow[] = await db`
				SELECT
					date_trunc(${this.bucket}, end_time) as bucket_start,
					SUM(distance) as distance,
					SUM(duration) as duration,
					AVG(speed) as speed,
					AVG(consumption) as consumption
				FROM trips
				WHERE end_time >= ${fromUtcDateTime(this.startUtc)}
					AND end_time < ${fromUtcDateTime(this.endUtc)}
					AND vehicle_id = ${this.vehicleId}
				GROUP BY bucket_start
				ORDER BY bucket_start
			`
		return rows
	}
}
