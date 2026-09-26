import type { StatWithDelta } from "../types"

import type { TripSnapshot } from "../../db/queries/trips/FindTrips"

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
	trips: TripSnapshot[]
	hasTrips: boolean
}
