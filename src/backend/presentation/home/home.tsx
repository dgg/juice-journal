import type { Context } from "hono"
import { DateTime } from "luxon"
import { Hono } from "hono"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../../utils/dates"
import { formatDurationHm } from "../../utils/format"
import type { Env } from "../../utils/logger"

import { tripsQueries, type TripWithLocationRow } from "../../db/queries/trips"
import { vehiclesQueries, type VehicleRow } from "../../db/queries/vehicles"
import { statsQueries, type PeriodAggregates } from "../../db/queries/stats"

import { webAuth } from "../../../auth/web-auth"

import { HomePage } from "../../../frontend/pages/HomePage"
import type { HomeView } from "./types"

const computeHomeView = (
	vehicle: VehicleRow | null,
	localNow: DateTime,
	currentStats: PeriodAggregates,
	prevStats: PeriodAggregates,
	trips: TripWithLocationRow[]
): HomeView => {
	const hasTrips = trips.length > 0
	return {
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		monthLabel: localNow.toFormat("MMMM yyyy"),
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
}
interface UtcInterval {
	start: DateTime
	end: DateTime
}

async function queryStats(
	vehicleId: string | null,
	current: UtcInterval,
	prev: UtcInterval
): Promise<[PeriodAggregates, PeriodAggregates]> {
	return await Promise.all([
		statsQueries.periodAggregates({
			startUtc: current.start,
			endUtc: current.end,
			vehicleId: vehicleId ?? undefined
		}),
		statsQueries.periodAggregates({
			startUtc: prev.start,
			endUtc: prev.end,
			vehicleId: vehicleId ?? undefined
		})
	])
}

const calculateIntervals = (
	now: DateTime,
	tz: string
): { current: UtcInterval; prev: UtcInterval } => {
	const { startUtc: start, endUtc: end } = currentMonthBoundsUtc(tz, now)
	const current: UtcInterval = { start, end }

	const { startUtc: prevStart, endUtc: prevEnd } = prevMonthBoundsUtc(tz, now)
	const prev: UtcInterval = { start: prevStart, end: prevEnd }

	return { current, prev }
}

const findVehicle = async (): Promise<VehicleRow | null> => {
	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	const vehicle = vehicleId ? await vehiclesQueries.findVehicleById(vehicleId) : null

	return vehicle
}

export const homeDomain = new Hono<Env>().use(webAuth).get("/", async (c) => {
	const vehicle = await findVehicle()
	const vehicleId = vehicle?.id ?? null

	const tz = displayTz()
	const now = DateTime.now()
	const { current, prev } = calculateIntervals(now, tz)

	const [currentStats, prevStats] = await queryStats(vehicleId, current, prev)

	const trips = await tripsQueries.findTripsWithLocations({
		startUtc: current.start,
		endUtc: current.end,
		vehicleId: vehicleId ?? undefined
	})

	const data: HomeView = computeHomeView(
		vehicle,
		now.setZone(tz),
		currentStats,
		prevStats,
		trips
	)

	return c.html(<HomePage data={data} />)
})
