import type { FC } from "hono/jsx"

import { Layout } from "../Layout"
import { StatsSummaryGrid } from "../fragments/StatsSummaryGrid"

import { EmptyState } from "../components/EmptyState"
import { Header } from "../components/Header"
import { StickyCta } from "../components/StickyCta"
import { TripRow } from "../components/TripRow"

import type { HomeView } from "../../backend/presentation/home/types"

export const HomePage: FC<{ data: HomeView }> = ({ data }) => {
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
						{ href: "/trips/creation", label: "Log new trip", icon: "circle-plus" }
					]}
				/>
			</main>
		</Layout>
	)
}
