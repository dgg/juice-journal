import type { FC } from "hono/jsx"
import { Delta } from "../components/Delta"
import { EmptyState } from "../components/EmptyState"

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

const PeriodSwitcher: FC<{ data: StatsView }> = ({ data }) => {
	const selectedPeriod = data.period
	const selectedGranularity = data.yearGranularity
	return (
		<>
			<div class="period-switcher" role="group">
				{(["week", "month", "year"] as const).map((p) => (
					<button
						class={p === selectedPeriod ? "secondary" : "outline"}
						type="button"
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
							type="button"
						>
							{g === "month" ? "Month" : "Week"}
						</button>
					))}
				</div>
			) : null}
		</>
	)
}

const StatsGrid: FC<{ data: StatsView }> = ({ data }) => (
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
)

const VehicleLabel: FC<{ data: StatsView }> = ({ data }) => (
	<div class="stats-period-label">
		{data.vehicle ? <small> — {data.vehicle.description}</small> : null}
	</div>
)

// Variant A — offset: prev/next stepper around the label
export const OffsetFragment: FC<{ data: StatsView }> = ({ data }) => (
	<section id="stats-region">
		<PeriodSwitcher data={data} />

		<div class="period-stepper" role="group">
			<button type="button" aria-label="Previous period">◀</button>
			<strong class="period-stepper__label">{data.label}</strong>
			<button type="button" aria-label="Next period" disabled>▶</button>
		</div>

		<VehicleLabel data={data} />
		<StatsGrid data={data} />
		{data.hasTrips ? (
			<p class="empty-state">[prototype — charts not wired]</p>
		) : (
			<EmptyState />
		)}
	</section>
)

// Variant B — ref-date: native picker per period type
export const RefDateFragment: FC<{ data: StatsView }> = ({ data }) => {
	const input =
		data.period === "week" ? (
			<input type="week" name="ref" aria-label="Pick week" />
		) : data.period === "month" ? (
			<input type="month" name="ref" aria-label="Pick month" />
		) : (
			<select name="ref" aria-label="Pick year">
				<option>{data.label}</option>
			</select>
		)

	return (
		<section id="stats-region">
			<PeriodSwitcher data={data} />

			<div class="period-picker">
				<label for="ref">Period</label>
				{input}
				<button type="submit" class="secondary">Go</button>
			</div>

			<VehicleLabel data={data} />
			<StatsGrid data={data} />
			{data.hasTrips ? (
				<p class="empty-state">[prototype — charts not wired]</p>
			) : (
				<EmptyState />
			)}
		</section>
	)
}

// Variant C — offset + ref-date: picker flanked by prev/next
export const OffsetAndRefFragment: FC<{ data: StatsView }> = ({ data }) => {
	const input =
		data.period === "week" ? (
			<input type="week" name="ref" aria-label="Pick week" />
		) : data.period === "month" ? (
			<input type="month" name="ref" aria-label="Pick month" />
		) : (
			<select name="ref" aria-label="Pick year">
				<option>{data.label}</option>
			</select>
		)

	return (
		<section id="stats-region">
			<PeriodSwitcher data={data} />

			<div class="period-stepper period-stepper--picker" role="group">
				<button type="button" aria-label="Previous period">◀</button>
				{input}
				<button type="button" aria-label="Next period" disabled>▶</button>
			</div>

			<VehicleLabel data={data} />
			<StatsGrid data={data} />
			{data.hasTrips ? (
				<p class="empty-state">[prototype — charts not wired]</p>
			) : (
				<EmptyState />
			)}
		</section>
	)
}
