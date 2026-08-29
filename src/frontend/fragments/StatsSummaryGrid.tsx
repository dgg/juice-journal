import type { FC } from "hono/jsx"
import { StatCard } from "../components/StatCard"
import type { StatWithDelta } from "../../backend/stats"

export interface StatsSummary {
	totalDistance: StatWithDelta
	totalTime: StatWithDelta
	totalTimeHm: string | null
	avgSpeed: StatWithDelta
	avgDuration: StatWithDelta
	avgDurationHm: string | null
	avgConsumption: StatWithDelta
	tripCount: StatWithDelta
	period: "week" | "month" | "year"
}

export const StatsSummaryGrid: FC<{ data: StatsSummary }> = ({ data }) => {
	const delta = (s: StatWithDelta): number | null =>
		s.value !== null && s.prev !== null ? s.value - s.prev : null

	return (
		<>
			<div class="stats-hero-row">
				<StatCard
					stat={{
						label: "Total distance",
						value: data.totalDistance.value,
						unit: "km",
						delta: delta(data.totalDistance),
						icon: "route",
						period: data.period
					}}
					hero
				/>
				<StatCard
					stat={{
						label: "Total time driven",
						value: data.totalTime.value,
						unit: "",
						displayValue: data.totalTimeHm,
						delta: delta(data.totalTime),
						deltaUnit: "min",
						icon: "hourglass",
						period: data.period
					}}
					hero
				/>
			</div>
			<div class="stats-grid__row">
				<StatCard
					stat={{
						label: "Avg speed",
						value: data.avgSpeed.value,
						unit: "km/h",
						delta: delta(data.avgSpeed),
						icon: "gauge",
						period: data.period
					}}
				/>
				<StatCard
					stat={{
						label: "Avg duration",
						value: data.avgDuration.value,
						unit: "",
						displayValue: data.avgDurationHm,
						delta: delta(data.avgDuration),
						deltaUnit: "min",
						icon: "hourglass",
						period: data.period
					}}
				/>
				<StatCard
					stat={{
						label: "Avg consumption",
						value: data.avgConsumption.value,
						unit: "kWh/100km",
						delta: delta(data.avgConsumption),
						deltaUnit: "kWh/100km",
						icon: "ev-charger",
						period: data.period
					}}
				/>
				<StatCard
					stat={{
						label: "Trips",
						value: data.tripCount.value,
						unit: "",
						delta: delta(data.tripCount),
						period: data.period
					}}
				/>
			</div>
		</>
	)
}