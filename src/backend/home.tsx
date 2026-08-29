import type { Context } from "hono"
import { DateTime } from "luxon"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "./utils/dates"
import { formatDurationHm } from "./utils/format"
import type { Env } from "./utils/logger"

import { tripsQueries, type TripWithLocationRow } from "./db/queries/trips"
import { vehiclesQueries } from "./db/queries/vehicles"
import { statsQueries } from "./db/queries/stats"
import type { StatWithDelta } from "./stats"

import { HomePage } from "../frontend/pages/HomePage"

interface HomeData {
	vehicle: {
		id: string
		description: string
	} | null
	monthLabel: string
	stats: {
		totalDistance: StatWithDelta
		totalTime: StatWithDelta
		totalTimeHm: string | null
		avgSpeed: StatWithDelta
		avgDuration: StatWithDelta
		avgDurationHm: string | null
		avgConsumption: StatWithDelta
		tripCount: StatWithDelta
		period: "month"
	}
	trips: TripWithLocationRow[]
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

	const trips = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

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
