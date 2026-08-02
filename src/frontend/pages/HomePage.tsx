import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { StatsGrid } from "../components/StatCard"
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
}

interface HomePageData {
	vehicle: { id: string; description: string } | null
	monthLabel: string
	stats: {
		avgConsumption: number | null
		avgDuration: number | null
		totalDistance: number | null
		prevAvgConsumption: number | null
		prevAvgDuration: number | null
		prevTotalDistance: number | null
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
				<StatsGrid stats={data.stats} />
				<section id="trip-list" aria-label="Trip list">
					<h2>Trips</h2>
					{data.hasTrips
						? data.trips.map((trip) => <TripRow trip={trip} />)
						: <EmptyState />}
				</section>
				<StickyCta href="/trips/new" label="Log new trip" />
			</main>
		</Layout>
	)
}
