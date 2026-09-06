import type { Context } from "hono"
import { DateTime } from "luxon"
import { Hono } from "hono"

import { tripsQueries } from "../db/queries/trips"
import { statsQueries } from "../db/queries/stats"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../utils/dates"
import { formatDurationHm } from "../utils/format"
import type { Env } from "../utils/logger"

import { StatsSummaryGrid } from "../../frontend/fragments/StatsSummaryGrid"
import { errorHandler } from "./error"

export async function getPartialStats(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz_, now)
	const { startUtc: prevStartUtc, endUtc: prevEndUtc } = prevMonthBoundsUtc(
		displayTz_,
		now
	)

	const vehicleId = await tripsQueries.findLatestTripVehicleId()

	const currentStats = await statsQueries.periodAggregates({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const prevStats = await statsQueries.periodAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: vehicleId ?? undefined
	})

	return c.html(
		<StatsSummaryGrid
			data={{
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
				avgDuration: {
					value: currentStats.avgDuration,
					prev: prevStats.avgDuration
				},
				avgDurationHm: formatDurationHm(currentStats.avgDuration),
				avgConsumption: {
					value: currentStats.avgConsumption,
					prev: prevStats.avgConsumption
				},
				tripCount: { value: currentStats.tripCount, prev: prevStats.tripCount },
				period: "month" as const
			}}
		/>
	)
}

export const summaryDomain = new Hono<Env>()
	.onError(errorHandler)
	.get("/fragments/grid", getPartialStats)
