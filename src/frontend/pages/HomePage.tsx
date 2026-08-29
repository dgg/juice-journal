import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { StatsSummaryGrid } from "../fragments/StatsSummaryGrid"
import { TripRow } from "../components/TripRow"
import { EmptyState } from "../components/EmptyState"
import { StickyCta } from "../components/StickyCta"
import type { TripWithLocationRow } from "../../backend/db/queries/trips"
import type { StatWithDelta } from "../../backend/stats"

interface HomePageData {
	vehicle: { id: string; description: string } | null
	monthLabel: string
	stats: {
		totalDistance: StatWithDelta
		totalTime: StatWithDelta
		totalTimeHm: string | null
		avgSpeed: StatWithDelta
		avgDuration: StatWithDelta
		avgDurationHm: string | null
		avgConsumption: StatWithDelta
		tripCount: StatWithDelta
		period: "month"
	}
	trips: TripWithLocationRow[]
	hasTrips: boolean
}

export const HomePage: FC<{ data: HomePageData }> = ({ data }) => {
	return (
		<Layout title="Juice Journal">
			<main class="container">
				<Header
					month={data.monthLabel}
					vehicle={data.vehicle?.description ?? null}
				/>
				<section id="stats-region">
					<StatsSummaryGrid data={data.stats} />
				</section>
				<section id="trip-list" aria-label="Trip list">
					<h2>Trips</h2>
					{data.hasTrips ? (
						data.trips.map((trip) => <TripRow trip={trip} />)
					) : (
						<EmptyState />
					)}
				</section>
				<StickyCta
					actions={[
						{
							href: "/stats",
							label: "Stats",
							variant: "secondary",
							icon: "chart-no-axes-combined"
						},
						{ href: "/trips/new", label: "Log new trip", icon: "circle-plus" }
					]}
				/>
			</main>
		</Layout>
	)
}