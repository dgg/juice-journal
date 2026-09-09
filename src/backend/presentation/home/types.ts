import type { StatWithDelta } from "../types"

import type { TripWithLocationRow } from "../../db/queries/trips"

export interface HomeView {
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
