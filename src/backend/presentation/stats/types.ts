import * as z from "zod"
import type { StatWithDelta } from "../types"

const PERIODS = ["year", "week", "month"] as const
const period = z.enum(PERIODS).default("month")
export type Period = z.infer<typeof period>

const [_, ...YEAR_GRANULARITY] = PERIODS
const yearGranularity = z.enum(YEAR_GRANULARITY).default("month")
export type YearGranularity = z.infer<typeof yearGranularity>

export const statsQuerySchema = z.object({
	period,
	yearGranularity,
	date: z.preprocess(
		(s: string | undefined) => (s ? s : undefined),
		z
			.string()
			.regex(/^\d{4}(?:-W\d{2}|-\d{2})?$/, "Must be YYYY, YYYY-MM, or YYYY-Www")
			.optional()
	)
})

export type StatsQuery = z.output<typeof statsQuerySchema>

export interface StatsView {
	period: Period
	yearGranularity: YearGranularity
	label: string
	weekBoundsLabel: string | null
	vehicle: { id: string; description: string } | null
	stats: {
		totalDistance: StatWithDelta
		totalTime: StatWithDelta
		totalTimeHm: string | null
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
