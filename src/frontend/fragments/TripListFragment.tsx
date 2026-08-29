import type { FC } from "hono/jsx"
import { TripRow } from "../components/TripRow"
import { EmptyState } from "../components/EmptyState"
import type { TripWithLocationRow } from "../../backend/db/queries/trips"

export const TripListFragment: FC<{
	trips: TripWithLocationRow[]
	hasTrips: boolean
}> = ({ trips, hasTrips }) => {
	return <>{hasTrips ? trips.map((trip) => <TripRow trip={trip} />) : <EmptyState />}</>
}