import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../utils/dates"
import { formatDurationHm } from "../utils/format"
import { tripsQueries } from "../db/queries/trips"
import { vehiclesQueries } from "../db/queries/vehicles"
import { statsQueries } from "../db/queries/stats"
import type { Context } from "hono"
import type { Env } from "../utils/logger"
import { DateTime } from "luxon"
import { HomePage } from "../frontend/pages/HomePage"

interface HomeData {
	vehicle: {
		id: string
		description: string
	} | null
	monthLabel: string
	stats: {
		totalDistance: { value: number | null; prev: number | null }
		totalTime: { value: number | null; prev: number | null }
		totalTimeHm: string | null
		avgSpeed: { value: number | null; prev: number | null }
		avgDuration: { value: number | null; prev: number | null }
		avgDurationHm: string | null
		avgConsumption: { value: number | null; prev: number | null }
		tripCount: { value: number | null; prev: number | null }
		period: "month"
	}
	trips: Array<{
		id: string
		startTime: Date
		endTime: Date
		daypart: string
		durationMin: number
		distanceKm: number
		avgSpeedKmh: number | null
		avgConsumptionKwh100km: number | null
		odometerKm: number | null
		startLocation: string | null
		endLocation: string | null
		weatherStart: object | null
	}>
	hasTrips: boolean
}

export async function homeHandler(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz_, now)
	const { startUtc: prevStartUtc, endUtc: prevEndUtc } = prevMonthBoundsUtc(
		displayTz_,
		now
	)

	const monthLabel = now.setZone(displayTz_).toFormat("MMMM yyyy")

	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	let vehicle = null

	if (vehicleId) {
		vehicle = await vehiclesQueries.findVehicleById(vehicleId)
	}

	const [currentStats, prevStats] = await Promise.all([
		statsQueries.periodAggregates({
			startUtc,
			endUtc,
			vehicleId: vehicleId ?? undefined
		}),
		statsQueries.periodAggregates({
			startUtc: prevStartUtc,
			endUtc: prevEndUtc,
			vehicleId: vehicleId ?? undefined
		})
	])

	const tripsResult = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: trip.start_time.toJSDate(),
		endTime: trip.end_time.toJSDate(),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: trip.start_location,
		endLocation: trip.end_location,
		weatherStart: trip.weatherStart
	}))

	const hasTrips = trips.length > 0

	const data: HomeData = {
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		monthLabel,
		stats: {
			totalDistance: {
				value: currentStats.totalDistance,
				prev: prevStats.totalDistance
			},
			totalTime: {
				value: currentStats.totalDuration,
				prev: prevStats.totalDuration
			},
			totalTimeHm: formatDurationHm(currentStats.totalDuration),
			avgSpeed: { value: currentStats.avgSpeed, prev: prevStats.avgSpeed },
			avgDuration: { value: currentStats.avgDuration, prev: prevStats.avgDuration },
			avgDurationHm: formatDurationHm(currentStats.avgDuration),
			avgConsumption: {
				value: currentStats.avgConsumption,
				prev: prevStats.avgConsumption
			},
			tripCount: { value: currentStats.tripCount, prev: prevStats.tripCount },
			period: "month"
		},
		trips,
		hasTrips
	}

	return c.html(<HomePage data={data} />)
}
