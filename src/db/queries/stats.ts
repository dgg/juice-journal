import { db } from "../client"
import { toNumber } from "../convert"
import { DateTime } from "luxon"

export interface PeriodAggregates {
	avgConsumption: number | null
	avgDuration: number | null
	totalDistance: number | null
	avgSpeed: number | null
	tripCount: number | null
}

export interface PeriodSeriesRow {
	label: string
	distance_km: number
	duration_min: number
	avg_speed_kmh: number | null
	avg_consumption_kwh_100km: number | null
}

function appDisplayTz(): string {
	return process.env.DISPLAY_TZ || "Europe/Copenhagen"
}

export const statsQueries = {
	async periodAggregates(params: {
		startUtc: string
		endUtc: string
		vehicleId?: string
	}): Promise<PeriodAggregates> {
		const rows = params.vehicleId
			? await db`
				SELECT
					AVG(avg_consumption_kwh_100km) as avg_consumption,
					AVG(duration_min) as avg_duration,
					SUM(distance_km) as total_distance,
					AVG(avg_speed_kmh) as avg_speed,
					COUNT(*) as trip_count
				FROM trips
				WHERE end_time >= ${params.startUtc}
					AND end_time < ${params.endUtc}
					AND vehicle_id = ${params.vehicleId}
			`
			: await db`
				SELECT
					AVG(avg_consumption_kwh_100km) as avg_consumption,
					AVG(duration_min) as avg_duration,
					SUM(distance_km) as total_distance,
					AVG(avg_speed_kmh) as avg_speed,
					COUNT(*) as trip_count
				FROM trips
				WHERE end_time >= ${params.startUtc}
					AND end_time < ${params.endUtc}
			`
		const raw = rows[0] as unknown as Record<string, unknown>
		const totalDistance = toNumber(raw.total_distance as string | null)
		return {
			avgConsumption: toNumber(raw.avg_consumption as string | null),
			avgDuration: toNumber(raw.avg_duration as string | null),
			totalDistance: totalDistance,
			avgSpeed: toNumber(raw.avg_speed as string | null),
			tripCount:
				totalDistance !== null ? (toNumber(raw.trip_count as string) ?? 0) : null
		}
	},

	// Backwards compatibility alias - keep existing callers working
	monthlyAggregates: async function (params: {
		startUtc: string
		endUtc: string
		vehicleId?: string
	}) {
		const result = await this.periodAggregates(params)
		return {
			avgConsumption: result.avgConsumption,
			avgDuration: result.avgDuration,
			totalDistance: result.totalDistance
		}
	},

	async periodSeries(params: {
		startUtc: string
		endUtc: string
		vehicleId?: string
		bucket: "trip" | "day" | "week" | "month"
		displayTz?: string
	}): Promise<PeriodSeriesRow[]> {
		const { startUtc, endUtc, vehicleId, bucket } = params
		const tz = params.displayTz || appDisplayTz()

		if (bucket === "trip") {
			const rows = vehicleId
				? await db`
					SELECT
						trips.end_time,
						trips.daypart,
						distance_km,
						duration_min,
						avg_speed_kmh,
						avg_consumption_kwh_100km
					FROM trips
					WHERE end_time >= ${startUtc}
						AND end_time < ${endUtc}
						AND vehicle_id = ${vehicleId}
					ORDER BY end_time ASC
				`
				: await db`
					SELECT
						trips.end_time,
						trips.daypart,
						distance_km,
						duration_min,
						avg_speed_kmh,
						avg_consumption_kwh_100km
					FROM trips
					WHERE end_time >= ${startUtc}
						AND end_time < ${endUtc}
					ORDER BY end_time ASC
				`

			return rows.map((row: Record<string, unknown>) => {
				const endTime =
					row.end_time instanceof Date
						? DateTime.fromJSDate(row.end_time as Date).setZone(tz)
						: DateTime.fromISO(row.end_time as string).setZone(tz)
				const icon = row.daypart === "afternoon" ? "🌙" : "☀"
				return {
					label: endTime.toFormat("dd MMM") + " " + icon,
					distance_km: Number(row.distance_km) || 0,
					duration_min: Number(row.duration_min) || 0,
					avg_speed_kmh:
						row.avg_speed_kmh !== null ? Number(row.avg_speed_kmh) : null,
					avg_consumption_kwh_100km:
						row.avg_consumption_kwh_100km !== null
							? Number(row.avg_consumption_kwh_100km)
							: null
				}
			})
		} else if (bucket === "day" || bucket === "week" || bucket === "month") {
			const sql = `
				SELECT
					date_trunc('${bucket}', timezone('${tz}', trips.end_time)) as bucket_start,
					SUM(distance_km) as distance_km,
					SUM(duration_min) as duration_min,
					AVG(avg_speed_kmh) as avg_speed_kmh,
					AVG(avg_consumption_kwh_100km) as avg_consumption_kwh_100km
				FROM trips
				WHERE end_time >= $1 AND end_time < $2
				${vehicleId ? "AND vehicle_id = $3" : ""}
				GROUP BY date_trunc('${bucket}', timezone('${tz}', trips.end_time))
				ORDER BY date_trunc('${bucket}', timezone('${tz}', trips.end_time)) ASC
			`.trim()

			const queryParams = vehicleId
				? [startUtc, endUtc, vehicleId]
				: [startUtc, endUtc]
			const rows = await db.unsafe(sql, queryParams)

			return rows.map((row: Record<string, unknown>) => {
				const bucketStart =
					row.bucket_start instanceof Date
						? DateTime.fromJSDate(row.bucket_start as Date).setZone(tz)
						: DateTime.fromISO(row.bucket_start as string).setZone(tz)
				let label: string
				if (bucket === "day") {
					label = bucketStart.toFormat("dd MMM")
				} else if (bucket === "week") {
					label = bucketStart.toFormat("'W'WW")
				} else {
					label = bucketStart.toFormat("MMM")
				}
				return {
					label,
					distance_km: Number(row.distance_km) || 0,
					duration_min: Number(row.duration_min) || 0,
					avg_speed_kmh:
						row.avg_speed_kmh !== null ? Number(row.avg_speed_kmh) : null,
					avg_consumption_kwh_100km:
						row.avg_consumption_kwh_100km !== null
							? Number(row.avg_consumption_kwh_100km)
							: null
				}
			})
		} else {
			throw new Error("Invalid bucket type: " + bucket)
		}
	}
}
