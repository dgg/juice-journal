import type { FC } from "hono/jsx"
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
	date: string | null
	prevDate: string | null
	nextDate: string | null
	yearOptions: number[]
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

const PeriodNavigation: FC<{ data: StatsView }> = ({ data }) => {
	const picker =
		data.period === "week" ? (
			<input
				type="week"
				name="date"
				value={data.date ?? ""}
				hx-get="/partials/trip-stats"
				hx-target="#stats-region"
				hx-swap="outerHTML"
				hx-trigger="change"
				hx-include="this"
				hx-vals={JSON.stringify({
					period: data.period,
					yearGranularity: data.yearGranularity
				})}
				aria-label="Pick week"
			/>
		) : data.period === "month" ? (
			<input
				type="month"
				name="date"
				value={data.date ?? ""}
				hx-get="/partials/trip-stats"
				hx-target="#stats-region"
				hx-swap="outerHTML"
				hx-trigger="change"
				hx-include="this"
				hx-vals={JSON.stringify({
					period: data.period,
					yearGranularity: data.yearGranularity
				})}
				aria-label="Pick month"
			/>
		) : (
			<select
				name="date"
				hx-get="/partials/trip-stats"
				hx-target="#stats-region"
				hx-swap="outerHTML"
				hx-trigger="change"
				hx-include="this"
				hx-vals={JSON.stringify({
					period: "year",
					yearGranularity: data.yearGranularity
				})}
				aria-label="Pick year"
			>
				{data.yearOptions.map((y) => (
					<option value={String(y)} selected={String(y) === data.date}>
						{y}
					</option>
				))}
			</select>
		)

	return (
		<div class="period-stepper period-stepper--picker" role="group">
			<button
				class="outline"
				hx-get="/partials/trip-stats"
				hx-target="#stats-region"
				hx-swap="outerHTML"
				hx-vals={JSON.stringify({
					period: data.period,
					yearGranularity: data.yearGranularity,
					date: data.prevDate
				})}
				aria-label="Previous period"
			>
				◀
			</button>
			{picker}
			<button
				class="outline"
				hx-get="/partials/trip-stats"
				hx-target="#stats-region"
				hx-swap="outerHTML"
				hx-vals={JSON.stringify({
					period: data.period,
					yearGranularity: data.yearGranularity,
					date: data.nextDate
				})}
				disabled={data.nextDate == null}
				aria-label="Next period"
			>
				▶
			</button>
		</div>
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
							yearGranularity: selectedGranularity,
							date: data.date
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
								yearGranularity: g,
								date: data.date
							})}
						>
							{g === "month" ? "Month" : "Week"}
						</button>
					))}
				</div>
			) : null}

			<PeriodNavigation data={data} />

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
