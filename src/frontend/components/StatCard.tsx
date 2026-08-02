import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { Delta } from "./Delta"

interface Stat {
	label: string
	value: number | null
	unit: string
	delta?: number | null
	deltaUnit?: string
}

export const StatCard: FC<{ stat: Stat; hero?: boolean }> = ({
	stat,
	hero
}) => {
	const hasValue = stat.value !== null
	if (hero) {
		return (
			<article
				style={{
					background: "var(--pico-card-background-color)",
					padding: "1.5rem",
					borderRadius: "var(--pico-border-radius)",
					textAlign: "center"
				}}
			>
				<div
					style={{
						fontSize: "2rem",
						fontWeight: 700,
						color: hasValue ? "var(--pico-primary)" : "var(--pico-muted-color)"
					}}
				>
					{hasValue ? formatNumber(stat.value, 1) : "--"}{" "}
					<small style={{ fontSize: "1rem", fontWeight: 400 }}>{stat.unit}</small>
				</div>
				<div
					style={{
						fontSize: "0.875rem",
						color: "var(--pico-muted-color)",
						marginTop: "0.25rem"
					}}
				>
					{stat.label}
				</div>
				{stat.delta !== undefined && (
					<Delta value={stat.delta} unit={stat.deltaUnit || stat.unit} />
				)}
			</article>
		)
	}
	return (
		<article
			style={{
				background: "var(--pico-card-background-color)",
				padding: "1rem",
				borderRadius: "var(--pico-border-radius)",
				textAlign: "center"
			}}
		>
			<div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
				{hasValue ? formatNumber(stat.value, 0) : "--"}{" "}
				<small style={{ fontSize: "0.875rem", fontWeight: 400 }}>{stat.unit}</small>
			</div>
			<div
				style={{
					fontSize: "0.75rem",
					color: "var(--pico-muted-color)"
				}}
			>
				{stat.label}
			</div>
			{stat.delta !== undefined && (
				<Delta value={stat.delta} unit={stat.deltaUnit || stat.unit} />
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
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "1fr",
				gap: "1rem",
				marginBottom: "1.5rem"
			}}
		>
			<StatCard
				stat={{
					label: "Avg consumption",
					value: stats.avgConsumption,
					unit: "kWh/100km",
					delta: consumptionDelta,
					deltaUnit: "kWh/100km"
				}}
				hero
			/>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "1rem"
				}}
			>
				<StatCard
					stat={{
						label: "Avg duration",
						value: stats.avgDuration,
						unit: "min",
						delta: durationDelta,
						deltaUnit: "min"
					}}
				/>
				<StatCard
					stat={{
						label: "Total distance",
						value: stats.totalDistance,
						unit: "km"
					}}
				/>
			</div>
		</div>
	)
}
