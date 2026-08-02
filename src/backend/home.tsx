import {
	resolveDisplayTz,
	currentMonthBoundsUtc,
	prevMonthBoundsUtc
} from "../utils/dates"
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
		avgConsumption: number | null
		avgDuration: number | null
		totalDistance: number | null
		prevAvgConsumption: number | null
		prevAvgDuration: number | null
		prevTotalDistance: number | null
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
	}>
	hasTrips: boolean
}

export async function homeHandler(c: Context<Env>) {
	const displayTz = resolveDisplayTz(
		undefined,
		undefined,
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz, now)
	const { startUtc: prevStartUtc, endUtc: prevEndUtc } = prevMonthBoundsUtc(
		displayTz,
		now
	)

	const monthLabel = now.setZone(displayTz).toFormat("MMMM yyyy")

	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	let vehicle = null

	if (vehicleId) {
		vehicle = await vehiclesQueries.findVehicleById(vehicleId)
	}

	const currentStats = await statsQueries.monthlyAggregates({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const prevStats = await statsQueries.monthlyAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: vehicleId ?? undefined
	})

	const tripsResult = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: new Date(trip.start_time.toISO() as string),
		endTime: new Date(trip.end_time.toISO() as string),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: trip.start_location,
		endLocation: trip.end_location
	}))

	const hasTrips = trips.length > 0

	const data: HomeData = {
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		monthLabel,
		stats: {
			avgConsumption: currentStats.avgConsumption,
			avgDuration: currentStats.avgDuration,
			totalDistance: currentStats.totalDistance,
			prevAvgConsumption: prevStats.avgConsumption,
			prevAvgDuration: prevStats.avgDuration,
			prevTotalDistance: prevStats.totalDistance
		},
		trips,
		hasTrips
	}

	return c.html(<HomePage data={data} />)
}
