import type { FC } from "hono/jsx"
import { TripRow } from "../components/TripRow"
import { EmptyState } from "../components/EmptyState"

interface Trip {
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
	weatherStart: object | null
}

export const TripListFragment: FC<{ trips: Trip[]; hasTrips: boolean }> = ({
	trips,
	hasTrips
}) => {
	return <>{hasTrips ? trips.map((trip) => <TripRow trip={trip} />) : <EmptyState />}</>
}
