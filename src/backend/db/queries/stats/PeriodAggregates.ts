import type { DateTime } from "luxon"
import { DbQuery } from "../DbQuery"
import { fromUtcDateTime, toNumber } from "../../convert"

interface AggregateRow {
	avg_consumption: string | null
	avg_duration: string | null
	avg_speed: string | null
	total_distance: string | null
	total_duration: string | null
	trip_count: string
}

export interface AggregatedStats {
	avgConsumption: number | null
	avgDuration: number | null
	avgSpeed: number | null
	totalDistance: number| null
	totalDuration: number | null
	tripCount: number
}

export const NULL_STATS: AggregatedStats = {
	avgConsumption: null,
	avgDuration: null,
	totalDistance: null,
	totalDuration: null,
	avgSpeed: null,
	tripCount: 0
}

export class PeriodAggregates extends DbQuery<AggregateRow, AggregatedStats> {
	constructor(
		private readonly vehicleId: string,
		private readonly startUtc: DateTime,
		private readonly endUtc: DateTime
	) {
		super()
	}

	protected override mapResults(rows: AggregateRow[]): AggregatedStats {
		const [raw] = rows
		const stats: AggregatedStats = {
			avgConsumption: toNumber(raw!.avg_consumption),
			avgDuration: toNumber(raw!.avg_duration)!,
			avgSpeed: toNumber(raw!.avg_speed),
			totalDistance: toNumber(raw!.total_distance)!,
			totalDuration: toNumber(raw!.total_duration)!,
			tripCount: toNumber(raw!.trip_count)!
		}
		return stats
	}

	protected override async doQuery(db: Bun.SQL): Promise<AggregateRow[]> {
		const rows: AggregateRow[] = await db`
					SELECT
						SUM(distance) as total_distance,
						SUM(duration) as total_duration,
						AVG(consumption) as avg_consumption,
						AVG(duration) as avg_duration,
						AVG(speed) as avg_speed,
						COUNT(*) as trip_count
					FROM trips
					WHERE end_time >= ${fromUtcDateTime(this.startUtc)}
						AND end_time < ${fromUtcDateTime(this.endUtc)}
						AND vehicle_id = ${this.vehicleId}
				`
		return rows
	}
}
