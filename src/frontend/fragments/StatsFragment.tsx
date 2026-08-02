import type { FC } from "hono/jsx"
import { StatsGrid } from "../components/StatCard"

export const StatsFragment: FC<{
	stats: {
		avgConsumption: number | null
		avgDuration: number | null
		totalDistance: number | null
		prevAvgConsumption: number | null
		prevAvgDuration: number | null
		prevTotalDistance: number | null
	}
}> = ({ stats }) => {
	return <StatsGrid stats={stats} />
}
