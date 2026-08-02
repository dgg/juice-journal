import { db } from "../client"
import { toNumber } from "../convert"

export interface MonthlyAggregates {
	avgConsumption: number | null
	avgDuration: number | null
	totalDistance: number | null
}

export const statsQueries = {
	async monthlyAggregates(params: {
		startUtc: string
		endUtc: string
		vehicleId?: string
	}): Promise<MonthlyAggregates> {
		const rows = params.vehicleId
			? await db`
				SELECT
					AVG(avg_consumption_kwh_100km) as avg_consumption,
					AVG(duration_min) as avg_duration,
					SUM(distance_km) as total_distance
				FROM trips
				WHERE end_time >= ${params.startUtc}
					AND end_time < ${params.endUtc}
					AND vehicle_id = ${params.vehicleId}
			`
			: await db`
				SELECT
					AVG(avg_consumption_kwh_100km) as avg_consumption,
					AVG(duration_min) as avg_duration,
					SUM(distance_km) as total_distance
				FROM trips
				WHERE end_time >= ${params.startUtc}
					AND end_time < ${params.endUtc}
			`
		const raw = rows[0] as unknown as Record<string, unknown>
		return {
			avgConsumption: toNumber(raw.avg_consumption as string | null),
			avgDuration: toNumber(raw.avg_duration as string | null),
			totalDistance: toNumber(raw.total_distance as string | null)
		}
	}
}
