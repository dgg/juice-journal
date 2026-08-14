import { tripsQueries } from "../db/queries/trips"
import { statsQueries } from "../db/queries/stats"
import { vehiclesQueries } from "../db/queries/vehicles"
import { resolveDisplayTz, periodBoundsUtc } from "../utils/dates"
import type { Context } from "hono"
import type { Env } from "../utils/logger"
import { DateTime } from "luxon"
import { StatsPage } from "../frontend/pages/StatsPage"
import { StatsChartsFragment } from "../frontend/fragments/StatsChartsFragment"

const STATS_PERIODS = ["week", "month", "year"] as const
const YEAR_GRANULARITY = ["month", "week"] as const

const WEEK_RE = /^\d{4}-W\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/
const YEAR_RE = /^\d{4}$/

export function isValidDateFormat(date: string): boolean {
	return WEEK_RE.test(date) || MONTH_RE.test(date) || YEAR_RE.test(date)
}

export function parseStatsQuery(c: Context<Env>) {
	const period = c.req.query("period")
	const yearGranularity = c.req.query("yearGranularity")
	const date = c.req.query("date")

	if (period && !STATS_PERIODS.includes(period as any)) {
		return { error: c.text("Invalid period. Must be week, month, or year.", 400) }
	}
	if (yearGranularity && !YEAR_GRANULARITY.includes(yearGranularity as any)) {
		return { error: c.text("Invalid yearGranularity. Must be month or week.", 400) }
	}
	const selectedPeriod = (period || "month") as "week" | "month" | "year"
	if (date && !isValidDateFormat(date)) {
		return { error: c.text(`Invalid date parameter: ${date}.`, 400) }
	}

	return {
		period: selectedPeriod,
		yearGranularity: (yearGranularity || "month") as "month" | "week",
		date: date || undefined
	}
}

export function resolveAnchor(
	dateParam: string | undefined,
	period: "week" | "month" | "year",
	displayTz: string
): DateTime {
	if (!dateParam) return DateTime.now()

	switch (period) {
		case "week": {
			const dt = DateTime.fromISO(dateParam, { zone: displayTz })
			return dt.isValid ? dt : DateTime.now()
		}
		case "month": {
			const dt = DateTime.fromISO(dateParam, { zone: displayTz })
			return dt.isValid ? dt : DateTime.now()
		}
		case "year": {
			const dt = DateTime.fromISO(`${dateParam}-01-01`, { zone: displayTz })
			return dt.isValid ? dt : DateTime.now()
		}
	}
}

export function formatDateForPeriod(dt: DateTime, period: "week" | "month" | "year"): string {
	switch (period) {
		case "week":
			return dt.toFormat("kkkk-'W'WW")
		case "month":
			return dt.toFormat("yyyy-MM")
		case "year":
			return dt.toFormat("yyyy")
	}
}

interface StatWithDelta {
	value: number | null
	prev: number | null
}

interface StatsView {
	period: "week" | "month" | "year"
	yearGranularity: "month" | "week"
	label: string
	vehicle: { id: string; description: string } | null
	stats: {
		totalDistance: StatWithDelta
		avgSpeed: StatWithDelta
		avgDuration: StatWithDelta
		avgDurationHm: string | null
		avgConsumption: StatWithDelta
		tripCount: StatWithDelta
	}
	series: {
		labels: string[]
		distance: number[]
		duration: number[]
		speed: (number | null)[]
		consumption: (number | null)[]
	}
	hasTrips: boolean
	date: string | null
	prevDate: string | null
	nextDate: string | null
	yearOptions: number[]
}

function formatDurationHm(minutes: number | null): string | null {
	if (minutes === null) return null
	const h = Math.floor(minutes / 60)
	const m = Math.round(minutes % 60)
	if (h === 0) return `${m}m`
	if (m === 0) return `${h}h`
	return `${h}h ${m}m`
}

function periodLabelFn(period: "week" | "month" | "year", now: DateTime): string {
	const nowInZone = now.setZone(process.env.DISPLAY_TZ || "Europe/Copenhagen")
	switch (period) {
		case "week":
			return nowInZone.startOf("week").toFormat("'W'WW yyyy")
		case "month":
			return nowInZone.toFormat("MMMM yyyy")
		case "year":
			return nowInZone.toFormat("yyyy")
	}
}

async function computeStatsView(params: {
	period: "week" | "month" | "year"
	yearGranularity: "month" | "week"
	displayTz: string
	now: DateTime
}): Promise<StatsView> {
	const { period, yearGranularity, displayTz, now } = params

	const bounds = periodBoundsUtc(period, displayTz, now)
	const prevBounds = bounds.previous

	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	const vehicle = vehicleId ? await vehiclesQueries.findVehicleById(vehicleId) : null

	const [currentStats, prevStats] = await Promise.all([
		statsQueries.periodAggregates({
			startUtc: bounds.current.startUtc,
			endUtc: bounds.current.endUtc,
			vehicleId: vehicleId ?? undefined
		}),
		statsQueries.periodAggregates({
			startUtc: prevBounds.startUtc,
			endUtc: prevBounds.endUtc,
			vehicleId: vehicleId ?? undefined
		})
	])

	const label = periodLabelFn(period, now)
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
		const bucket = period === "year" ? yearGranularity : period === "month" ? "day" : "trip"

		const rows = await statsQueries.periodSeries({
			startUtc: bounds.current.startUtc,
			endUtc: bounds.current.endUtc,
			vehicleId: vehicleId ?? undefined,
			bucket,
			displayTz
		})

		series = {
			labels: rows.map((r) => r.label),
			distance: rows.map((r) => r.distance_km),
			duration: rows.map((r) => r.duration_min),
			speed: rows.map((r) => r.avg_speed_kmh),
			consumption: rows.map((r) => r.avg_consumption_kwh_100km)
		}
	}

	// Compute prev/next dates
	const unit = period === "week" ? "weeks" : period === "month" ? "months" : "years"
	const prevDate = formatDateForPeriod(now.minus({ [unit]: 1 }), period)
	const nextRaw = now.plus({ [unit]: 1 })
	const nowStart = DateTime.now().setZone(displayTz).startOf(period)
	const nextDate = nextRaw.startOf(period) <= nowStart ? formatDateForPeriod(nextRaw, period) : null

	// Year options for year picker
	let yearOptions: number[] = []
	if (period === "year") {
		const earliestYear = await tripsQueries.findEarliestTripYear()
		const currentYear = DateTime.now().setZone(displayTz).year
		const startYear = earliestYear ?? currentYear
		yearOptions = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i).reverse()
	}

	return {
		period,
		yearGranularity,
		label,
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		stats: {
			totalDistance: {
				value: currentStats.totalDistance,
				prev: prevStats.totalDistance
			},
			avgSpeed: {
				value: currentStats.avgSpeed,
				prev: prevStats.avgSpeed
			},
			avgDuration: {
				value: currentStats.avgDuration,
				prev: prevStats.avgDuration
			},
			avgDurationHm: formatDurationHm(currentStats.avgDuration),
			avgConsumption: {
				value: currentStats.avgConsumption,
				prev: prevStats.avgConsumption
			},
			tripCount: {
				value: currentStats.tripCount,
				prev: prevStats.tripCount
			}
		},
		series,
		hasTrips,
		date: formatDateForPeriod(now, period),
		prevDate,
		nextDate,
		yearOptions
	}
}

export async function statsHandler(c: Context<Env>) {
	const parsed = parseStatsQuery(c)
	if ("error" in parsed) return parsed.error

	const { period, yearGranularity, date } = parsed
	const displayTz = resolveDisplayTz(
		undefined,
		undefined,
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)
	const now = resolveAnchor(date, period, displayTz)

	const view = await computeStatsView({ period, yearGranularity, displayTz, now })

	return c.html(<StatsPage data={view} />)
}

export async function getPartialTripStats(c: Context<Env>) {
	const parsed = parseStatsQuery(c)
	if ("error" in parsed) return parsed.error

	const { period, yearGranularity, date } = parsed
	const displayTz = resolveDisplayTz(
		undefined,
		undefined,
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)
	const now = resolveAnchor(date, period, displayTz)

	const view = await computeStatsView({ period, yearGranularity, displayTz, now })

	return c.html(<StatsChartsFragment data={view} />)
}
