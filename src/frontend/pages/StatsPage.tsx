import type { FC } from "hono/jsx"
import { raw } from "hono/html"
import { Layout } from "../Layout"
import { StatsChartsFragment } from "../fragments/StatsChartsFragment"
import { StickyCta } from "../components/StickyCta"

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

const Scripts = () => (
	<>
		<script
			src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"
			integrity="sha256-SERKgtTty1vsDxll+qzd4Y2cF9swY9BCq62i9wXJ9Uo="
			crossorigin="anonymous" />
		<script src="/static/stats-charts.js" defer />
	</>
)

export const StatsPage: FC<{ data: StatsView }> = ({ data }) => {
	return (
		<Layout title="Stats — Juice Journal">
			<main class="container">
				<StatsChartsFragment data={data} />
				<StickyCta actions={[{ href: "/", label: "Back" }]} />
			</main>
			<Scripts />
		</Layout>
	)
}
