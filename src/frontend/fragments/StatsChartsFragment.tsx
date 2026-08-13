import type { FC } from "hono/jsx"
import { StatsGrid } from "../components/StatCard"
import { Delta } from "../components/Delta"
import { EmptyState } from "../components/EmptyState"
import { raw } from "hono/html"

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
}

function StatCard({
	label,
	value,
	unit,
	prev
}: {
	label: string
	value: number | null
	unit: string
	prev: number | null
}) {
	const hasValue = value !== null
	const formatted = hasValue
		? value % 1 === 0
			? value.toString()
			: value.toFixed(1)
		: "--"

	const delta = value !== null && prev !== null ? value - prev : null
	const absDelta = delta !== null ? Math.abs(delta) : null
	const formattedDelta =
		absDelta !== null
			? absDelta % 1 === 0
				? absDelta.toString()
				: absDelta.toFixed(1)
			: null

	return (
		<article class="stat-card">
			<p class="stat-card__value">
				<data value={value ?? ""}>{formatted}</data> <small>{unit}</small>
			</p>
			<small class="stat-card__label">{label}</small>
			{delta !== null && formattedDelta !== null ? (
				<Delta value={delta} unit={unit} />
			) : null}
		</article>
	)
}

export const StatsChartsFragment: FC<{ data: StatsView }> = ({ data }) => {
	const selectedPeriod = data.period
	const selectedGranularity = data.yearGranularity

	return (
		<section id="stats-region">
			<div class="period-switcher" role="group">
				{(["week", "month", "year"] as const).map((p) => (
					<button
						class={p === selectedPeriod ? "secondary" : "outline"}
						hx-get="/partials/trip-stats"
						hx-target="#stats-region"
						hx-swap="outerHTML"
						hx-vals={JSON.stringify({
							period: p,
							yearGranularity: selectedGranularity
						})}
					>
						{p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
					</button>
				))}
			</div>

			{data.period === "year" ? (
				<div class="year-granularity" role="group">
					{(["month", "week"] as const).map((g) => (
						<button
							class={g === selectedGranularity ? "secondary" : "outline"}
							hx-get="/partials/trip-stats"
							hx-target="#stats-region"
							hx-swap="outerHTML"
							hx-vals={JSON.stringify({
								period: "year",
								yearGranularity: g
							})}
						>
							{g === "month" ? "Month" : "Week"}
						</button>
					))}
				</div>
			) : null}

			<div class="stats-period-label">
				<small>{data.label}</small>
				{data.vehicle ? <small> — {data.vehicle.description}</small> : null}
			</div>

			<div class="stats-grid">
				<StatCard
					label="Total distance"
					value={data.stats.totalDistance.value}
					unit="km"
					prev={data.stats.totalDistance.prev}
				/>
				<StatCard
					label="Avg speed"
					value={data.stats.avgSpeed.value}
					unit="km/h"
					prev={data.stats.avgSpeed.prev}
				/>
				<StatCard
					label="Avg duration"
					value={data.stats.avgDuration.value}
					unit={data.stats.avgDurationHm ?? "min"}
					prev={data.stats.avgDuration.prev}
				/>
				<StatCard
					label="Avg consumption"
					value={data.stats.avgConsumption.value}
					unit="kWh/100km"
					prev={data.stats.avgConsumption.prev}
				/>
				<StatCard
					label="Trips"
					value={data.stats.tripCount.value}
					unit=""
					prev={data.stats.tripCount.prev}
				/>
			</div>

			{data.hasTrips ? (
				<div id="stats-charts">
					<article>
						<script id="stats-data" type="application/json">
							{raw(JSON.stringify(data.series))}
						</script>
						<div class="chart-row">
							<div class="chart-container">
								<h3>Distance & Duration</h3>
								<canvas id="chart-distance-duration"></canvas>
							</div>
							<div class="chart-container">
								<h3>Avg Speed & Consumption</h3>
								<canvas id="chart-speed-consumption"></canvas>
							</div>
						</div>
					</article>
				</div>
			) : (
				<EmptyState />
			)}
		</section>
	)
}
