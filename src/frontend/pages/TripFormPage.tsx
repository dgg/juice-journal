import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { StickyCta } from "../components/StickyCta"

export const TripFormPage: FC = () => {
	return (
		<Layout title="Log trip — Juice Journal">
			<main class="container">
				<Header month="Log new trip" vehicle={null} />
				<form
					action="/trips"
					method="post"
					hx-post="/trips"
					hx-target="#trip-list"
					hx-swap="beforeend"
				>
					<fieldset>
						<label>
							Vehicle ID
							<input
								name="vehicle_id"
								type="text"
								required
								pattern="[A-Za-z0-9_-]{16}"
								maxLength={16}
							/>
						</label>
						<div class="grid">
							<label>
								Start location
								<input name="start_location_id" type="text" />
							</label>
							<label>
								End location
								<input name="end_location_id" type="text" />
							</label>
						</div>
						<div class="grid">
							<label>
								Start time
								<input
									name="start_time"
									type="datetime-local"
									required
								/>
							</label>
							<label>
								End time
								<input
									name="end_time"
									type="datetime-local"
									required
								/>
							</label>
						</div>
						<div class="grid">
							<label>
								Odometer (km)
								<input
									name="odometer_km"
									type="number"
									step="0.1"
								/>
							</label>
							<label>
								Consumption (kWh/100km)
								<input
									name="avg_consumption_kwh_100km"
									type="number"
									step="0.1"
								/>
							</label>
						</div>
						<input type="hidden" name="daypart" value="morning" />
						<input type="hidden" name="duration_min" value="0" />
						<input type="hidden" name="distance_km" value="0" />
						<button type="submit" class="contrast">Save trip</button>
					</fieldset>
				</form>
				<StickyCta href="/" label="Back to home" />
			</main>
		</Layout>
	)
}
