import type { FC } from "hono/jsx"
import { TripRow } from "../components/TripRow"
import { StatsGrid } from "../components/StatCard"

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
}

interface Stats {
	avgConsumption: number | null
	avgDuration: number | null
	totalDistance: number | null
	prevAvgConsumption: number | null
	prevAvgDuration: number | null
	prevTotalDistance: number | null
}

export const TripCreatedResponse: FC<{ trip: Trip; stats: Stats }> = ({
	trip,
	stats
}) => {
	return (
		<>
			<div hx-swap-oob="beforeend:#trip-list">
				<TripRow trip={trip} />
			</div>
			<div hx-swap-oob="true">
				<StatsGrid stats={stats} />
			</div>
		</>
	)
}
