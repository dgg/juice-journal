import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { Delta } from "./Delta"

interface Stat {
	label: string
	value: number | null
	unit: string
	delta?: number | null
	deltaUnit?: string
	displayValue?: string | null
	icon?: string
	period?: "week" | "month" | "year"
}

export const StatCard: FC<{ stat: Stat; hero?: boolean }> = ({ stat, hero }) => {
	const hasValue = stat.value !== null
	const formatted =
		stat.displayValue ??
		(hasValue ? formatNumber(stat.value, hero ? 1 : 0) : "--")

	return (
		<article
			class={`stat-card${hero ? " stat-card--hero" : ""}`}
			{...(hero && !hasValue ? { "data-empty": "" } : {})}
		>
			<p class="stat-card__value">
				<data value={stat.value ?? ""}>{formatted}</data>{" "}
				<small>{stat.unit}</small>
			</p>
			<small class="stat-card__label">
				{stat.icon && (
					<span class={`icon-${stat.icon}`} aria-hidden="true"></span>
				)}{" "}
				{stat.label}
			</small>
			{stat.delta !== undefined && (
				<Delta
					value={stat.delta}
					unit={stat.deltaUnit || stat.unit}
					period={stat.period}
				/>
			)}
		</article>
	)
}

export const StatsGrid: FC<{
	stats: {
		avgConsumption: number | null
		avgDuration: number | null
		totalDistance: number | null
		prevAvgConsumption: number | null
		prevAvgDuration: number | null
		prevTotalDistance: number | null
	}
}> = ({ stats }) => {
	const consumptionDelta =
		stats.avgConsumption !== null && stats.prevAvgConsumption !== null
			? stats.avgConsumption - stats.prevAvgConsumption
			: null
	const durationDelta =
		stats.avgDuration !== null && stats.prevAvgDuration !== null
			? stats.avgDuration - stats.prevAvgDuration
			: null

	return (
		<div class="stats-grid">
			<StatCard
				stat={{
					label: "Avg consumption",
					value: stats.avgConsumption,
					unit: "kWh/100km",
					delta: consumptionDelta,
					deltaUnit: "kWh/100km",
					icon: "ev-charger"
				}}
				hero
			/>
			<div class="stats-grid__row">
				<StatCard
					stat={{
						label: "Avg duration",
						value: stats.avgDuration,
						unit: "min",
						delta: durationDelta,
						deltaUnit: "min",
						icon: "hourglass"
					}}
				/>
				<StatCard
					stat={{
						label: "Total distance",
						value: stats.totalDistance,
						unit: "km",
						icon: "route"
					}}
				/>
			</div>
		</div>
	)
}
