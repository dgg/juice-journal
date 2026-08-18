import type { FC } from "hono/jsx"
import { StatCard } from "../components/StatCard"
import { EmptyState } from "../components/EmptyState"
import { raw } from "hono/html"

function periodIcon(value: string): string {
	if (value === "week") return "calendar-1"
	if (value === "month") return "calendar-days"
	return "calendar"
}

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
			totalTime: StatWithDelta
			totalTimeHm: string | null
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
				<span class="icon-move-left" aria-hidden="true"></span>
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
				<span class="icon-move-right" aria-hidden="true"></span>
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
						<span class={`icon-${periodIcon(p)}`} aria-hidden="true"></span>
						{p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
					</button>
				))}
			</div>

			<PeriodNavigation data={data} />

			<div class="stats-period-label">
				<small>{data.label}</small>
				{data.vehicle ? (
					<small>
						<span class="icon-car-front" aria-hidden="true"></span>{" "}
						{data.vehicle.description}
					</small>
				) : null}
			</div>

			{data.hasTrips ? (
				<>
					<div class="stats-hero-row">
						<StatCard
							stat={{
								label: "Total distance",
								value: data.stats.totalDistance.value,
								unit: "km",
								delta:
									data.stats.totalDistance.value !== null &&
									data.stats.totalDistance.prev !== null
										? data.stats.totalDistance.value - data.stats.totalDistance.prev
										: null,
								icon: "route",
								period: data.period
							}}
							hero
						/>
						<StatCard
							stat={{
								label: "Total time driven",
								value: data.stats.totalTime.value,
								unit: "",
								displayValue: data.stats.totalTimeHm,
								delta:
									data.stats.totalTime.value !== null &&
									data.stats.totalTime.prev !== null
										? data.stats.totalTime.value - data.stats.totalTime.prev
										: null,
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
								value: data.stats.avgSpeed.value,
								unit: "km/h",
								delta:
									data.stats.avgSpeed.value !== null &&
									data.stats.avgSpeed.prev !== null
										? data.stats.avgSpeed.value - data.stats.avgSpeed.prev
										: null,
								icon: "gauge",
								period: data.period
							}}
						/>
						<StatCard
							stat={{
								label: "Avg duration",
								value: data.stats.avgDuration.value,
								unit: "",
								displayValue: data.stats.avgDurationHm,
								delta:
									data.stats.avgDuration.value !== null &&
									data.stats.avgDuration.prev !== null
										? data.stats.avgDuration.value - data.stats.avgDuration.prev
										: null,
								deltaUnit: "min",
								icon: "hourglass",
								period: data.period
							}}
						/>
						<StatCard
							stat={{
								label: "Avg consumption",
								value: data.stats.avgConsumption.value,
								unit: "kWh/100km",
								delta:
									data.stats.avgConsumption.value !== null &&
									data.stats.avgConsumption.prev !== null
										? data.stats.avgConsumption.value - data.stats.avgConsumption.prev
										: null,
								deltaUnit: "kWh/100km",
								icon: "ev-charger",
								period: data.period
							}}
						/>
						<StatCard
							stat={{
								label: "Trips",
								value: data.stats.tripCount.value,
								unit: "",
								delta:
									data.stats.tripCount.value !== null &&
									data.stats.tripCount.prev !== null
										? data.stats.tripCount.value - data.stats.tripCount.prev
										: null,
								period: data.period
							}}
						/>
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
									<span
										class={`icon-${periodIcon(g)}`}
										aria-hidden="true"
									></span>
									{g === "month" ? "Month" : "Week"}
								</button>
							))}
						</div>
					) : null}
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
				</>
			) : (
				<EmptyState message="No stats for this period" />
			)}
		</section>
	)
}
