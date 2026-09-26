import { DateTime } from "luxon"
import { Hono } from "hono"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../../utils/dates"
import { formatDurationHm } from "../../utils/format"
import type { Env } from "../../utils/logger"

import type { TripSnapshot } from "../../db/queries/trips/FindTrips"

import {
	GetFromLatestTrip,
	type VehicleRow
} from "../../db/queries/vehicles/GetFromLatestTrip"
import {
	NULL_STATS,
	PeriodAggregates,
	type AggregatedStats
} from "../../db/queries/stats/PeriodAggregates"

import { webAuth } from "../auth/web-auth"

import { HomePage } from "../../../frontend/pages/HomePage"

import type { HomeView } from "./types"
import { FindTrips } from "../../db/queries/trips/FindTrips"

const computeHomeView = (
	vehicle: VehicleRow | null,
	localNow: DateTime,
	currentStats: AggregatedStats,
	prevStats: AggregatedStats,
	trips: TripSnapshot[]
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
	vehicleId: string,
	current: UtcInterval,
	prev: UtcInterval
): Promise<[AggregatedStats, AggregatedStats]> {
	return await Promise.all([
		new PeriodAggregates(vehicleId, current.start, current.end).execute(),
		new PeriodAggregates(vehicleId, prev.start, prev.end).execute()
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

export const homeDomain = new Hono<Env>().use(webAuth).get("/", async (c) => {
	const vehicle = await new GetFromLatestTrip().execute()

	const tz = displayTz()
	const now = DateTime.now()
	const { current, prev } = calculateIntervals(now, tz)

	const [currentStats, prevStats] = vehicle
		? await queryStats(vehicle.id, current, prev)
		: ([NULL_STATS, NULL_STATS] as const)

	const trips = vehicle
		? await new FindTrips(current.start, current.end, vehicle.id).execute()
		: []

	const data: HomeView = computeHomeView(
		vehicle,
		now.setZone(tz),
		currentStats,
		prevStats,
		trips
	)

	return c.html(<HomePage data={data} />)
})
