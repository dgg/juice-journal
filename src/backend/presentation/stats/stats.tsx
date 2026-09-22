import type { Context } from "hono"
import { DateTime } from "luxon"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"

import { tripsQueries } from "../../db/queries/trips"
import { statsQueries } from "../../db/queries/stats"
import { GetFromLatestTrip } from "../../db/queries/vehicles/GetFromLatestTrip"

import { displayTz, periodBoundsUtc } from "../../utils/dates"
import { formatDurationHm } from "../../utils/format"
import type { Env } from "../../utils/logger"

import { StatsPage } from "../../../frontend/pages/StatsPage"
import { StatsChartsFragment } from "../../../frontend/fragments/StatsChartsFragment"

import { webAuth } from "../auth/web-auth"
import {
	statsQuerySchema,
	type Period,
	type StatsQuery,
	type StatsView,
	type YearGranularity
} from "./types"
import { formatDate, formatDateLabel, resolveAnchor } from "./period"

const computeStatsView = async (params: {
	period: Period
	yearGranularity: YearGranularity
	tz: string
	now: DateTime
}): Promise<StatsView> => {
	const vehicle = await new GetFromLatestTrip().execute()

	const { period, yearGranularity, tz, now } = params

	const bounds = periodBoundsUtc(period, tz, now)
	const prevBounds = bounds.previous

	const [currentStats, prevStats] = await Promise.all([
		statsQueries.periodAggregates({
			startUtc: bounds.current.startUtc,
			endUtc: bounds.current.endUtc,
			vehicleId: vehicle?.id ?? undefined
		}),
		statsQueries.periodAggregates({
			startUtc: prevBounds.startUtc,
			endUtc: prevBounds.endUtc,
			vehicleId: vehicle?.id ?? undefined
		})
	])

	const label = formatDateLabel(period, now, tz)
	const weekBoundsLabel =
		period === "week"
			? `${now.setZone(tz).startOf("week").toFormat("dd MMM")} – ${now.setZone(tz).startOf("week").plus({ days: 6 }).toFormat("dd MMM")}`
			: null
	const hasTrips = currentStats.tripCount !== null && currentStats.tripCount > 0

	let series: StatsView["series"] = {
		labels: [],
		distance: [],
		duration: [],
		speed: [],
		consumption: []
	}

	if (hasTrips) {
		// Determine bucket: trip for week, day for month, yearGranularity for year
		const bucket =
			period === "year" ? yearGranularity : period === "month" ? "day" : "trip"

		const rows = await statsQueries.periodSeries({
			startUtc: bounds.current.startUtc,
			endUtc: bounds.current.endUtc,
			vehicleId: vehicle?.id ?? undefined,
			bucket,
			displayTz: tz
		})

		series = {
			labels: rows.map((r) => {
				let label: string
				if (bucket === "trip" || bucket === "day") {
					label = r.time.toFormat("dd MMM")
				} else if (bucket === "week") {
					label = r.time.toFormat("'W'WW")
				} else {
					label = r.time.toFormat("MMM")
				}
				if (r.daypart) {
					const icon = r.daypart === "afternoon" ? "🌙" : "☀"
					label += " " + icon
				}
				return label
			}),
			distance: rows.map((r) => r.distance),
			duration: rows.map((r) => r.duration),
			speed: rows.map((r) => r.speed),
			consumption: rows.map((r) => r.consumption)
		}
	}

	// Compute prev/next dates
	const unit = period === "week" ? "weeks" : period === "month" ? "months" : "years"
	const prevDate = formatDate(period, now.minus({ [unit]: 1 }))
	const nextRaw = now.plus({ [unit]: 1 })
	const nowStart = DateTime.now().setZone(tz).startOf(period)
	const nextDate =
		nextRaw.startOf(period) <= nowStart ? formatDate(period, nextRaw) : null

	// Year options for year picker
	let yearOptions: number[] = []
	if (period === "year") {
		const earliestYear = await tripsQueries.findEarliestTripYear()
		const currentYear = DateTime.now().setZone(tz).year
		const startYear = earliestYear ?? currentYear
		yearOptions = Array.from(
			{ length: currentYear - startYear + 1 },
			(_, i) => startYear + i
		).reverse()
	}

	return {
		period,
		yearGranularity,
		label,
		weekBoundsLabel,
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
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
			avgDuration: {
				value: currentStats.avgDuration,
				prev: prevStats.avgDuration
			},
			avgDurationHm: formatDurationHm(currentStats.avgDuration),
			avgConsumption: {
				value: currentStats.avgConsumption,
				prev: prevStats.avgConsumption
			},
			tripCount: { value: currentStats.tripCount, prev: prevStats.tripCount }
		},
		series,
		hasTrips,
		date: formatDate(period, now),
		prevDate,
		nextDate,
		yearOptions
	}
}

const calculateViewData = async (qs: StatsQuery): Promise<StatsView> => {
	const { period, yearGranularity, date } = qs
	const tz = displayTz()
	const now = resolveAnchor(period, date, tz)

	const view = await computeStatsView({
		period,
		yearGranularity,
		tz,
		now
	})
	return view
}

export const statsDomain = new Hono<Env>()
	.use(webAuth)
	.get("/", zValidator("query", statsQuerySchema), async (c) => {
		const view = await calculateViewData(c.req.valid("query"))
		return c.html(<StatsPage data={view} />)
	})
	.get("/fragments/charts", zValidator("query", statsQuerySchema), async (c) => {
		const view = await calculateViewData(c.req.valid("query"))
		return c.html(<StatsChartsFragment data={view} />)
	})
