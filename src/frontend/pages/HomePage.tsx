import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { StatsSummaryGrid } from "../fragments/StatsSummaryGrid"
import { TripRow } from "../components/TripRow"
import { EmptyState } from "../components/EmptyState"
import { StickyCta } from "../components/StickyCta"

interface Trip {
	id: string
	startTime: Date
	endTime: Date
	daypart: string
	durationMin: number
	distanceKm: number
	avgSpeedKmh: number | null
	avgConsumptionKwh100km: number | null
	odometerKm: number | null
	startLocation: string | null
	endLocation: string | null
	weatherStart: object | null
}

interface HomePageData {
	vehicle: { id: string; description: string } | null
	monthLabel: string
	stats: {
		totalDistance: { value: number | null; prev: number | null }
		totalTime: { value: number | null; prev: number | null }
		totalTimeHm: string | null
		avgSpeed: { value: number | null; prev: number | null }
		avgDuration: { value: number | null; prev: number | null }
		avgDurationHm: string | null
		avgConsumption: { value: number | null; prev: number | null }
		tripCount: { value: number | null; prev: number | null }
		period: "month"
	}
	trips: Trip[]
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
