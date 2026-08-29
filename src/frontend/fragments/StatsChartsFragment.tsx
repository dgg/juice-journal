import type { FC } from "hono/jsx"
import { StatsSummaryGrid } from "./StatsSummaryGrid"
import { EmptyState } from "../components/EmptyState"
import { raw } from "hono/html"
import type { StatsView } from "../../backend/stats"

function periodIcon(value: string): string {
	if (value === "week") return "calendar-1"
	if (value === "month") return "calendar-days"
	return "calendar"
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
					{data.weekBoundsLabel ? (
						<small>{data.weekBoundsLabel}</small>
					) : null}
					{data.vehicle ? (
					<small>
						<span class="icon-car-front" aria-hidden="true"></span>{" "}
						{data.vehicle.description}
					</small>
				) : null}
			</div>

			{data.hasTrips ? (
				<>
					<StatsSummaryGrid data={{ ...data.stats, period: data.period }} />
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
