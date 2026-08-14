import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { StickyCta } from "../components/StickyCta"
import {
	OffsetFragment,
	RefDateFragment,
	OffsetAndRefFragment
} from "../fragments/StatsPrototypeFragment"

interface StatsView {
	period: "week" | "month" | "year"
	yearGranularity: "month" | "week"
	label: string
	vehicle: { id: string; description: string } | null
	stats: {
		totalDistance: { value: number | null; prev: number | null }
		avgSpeed: { value: number | null; prev: number | null }
		avgDuration: { value: number | null; prev: number | null }
		avgDurationHm: string | null
		avgConsumption: { value: number | null; prev: number | null }
		tripCount: { value: number | null; prev: number | null }
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

const PrototypePage: FC<{
	data: StatsView
	title: string
	Fragment: FC<{ data: StatsView }>
}> = ({ data, title, Fragment }) => (
	<Layout title={title}>
		<main class="container">
			<Fragment data={data} />
			<StickyCta
				actions={[
					{ href: "/stats", label: "Back to stats", variant: "secondary" },
					{ href: "/", label: "Home" }
				]}
			/>
		</main>
	</Layout>
)

export const OffsetPage: FC<{ data: StatsView }> = ({ data }) => (
	<PrototypePage
		data={data}
		title="Stats (offset) — Juice Journal"
		Fragment={OffsetFragment}
	/>
)

export const RefDatePage: FC<{ data: StatsView }> = ({ data }) => (
	<PrototypePage
		data={data}
		title="Stats (ref-date) — Juice Journal"
		Fragment={RefDateFragment}
	/>
)

export const OffsetAndRefPage: FC<{ data: StatsView }> = ({ data }) => (
	<PrototypePage
		data={data}
		title="Stats (offset + ref) — Juice Journal"
		Fragment={OffsetAndRefFragment}
	/>
)
