import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { TripFormFragment } from "../fragments/TripFormFragment"
import type { Daypart, Location } from "../../backend/types"

interface VehicleOption {
	id: string
	description: string
}

interface TripFormPageProps {
	nowDate: string
	nowTime: string
	defaultDaypart: Daypart
	startLocation: Location
	endLocation: Location
	vehicles: VehicleOption[]
	defaultVehicleId: string | null
	errors?: Record<string, string>
	submitted?: Record<string, string>
}

export const TripFormPage: FC<TripFormPageProps> = (props) => {
	return (
		<Layout title="Log trip — Juice Journal">
			<main class="container">
				<Header month="Log new trip" vehicle={null} />
				<TripFormFragment {...props} />
			</main>
		</Layout>
	)
}