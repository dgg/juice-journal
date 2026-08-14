import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"

interface LocationOption {
	id: string
	label: string
}

interface VehicleOption {
	id: string
	description: string
}

interface TripFormPageProps {
	nowDate: string
	nowTime: string
	defaultDaypart: "morning" | "afternoon"
	startLocationId: string | null
	endLocationId: string | null
	locations: LocationOption[]
	vehicles: VehicleOption[]
	defaultVehicleId: string | null
}

export const TripFormPage: FC<TripFormPageProps> = ({
	nowDate,
	nowTime,
	defaultDaypart,
	startLocationId,
	endLocationId,
	locations,
	vehicles,
	defaultVehicleId
}) => {
	return (
		<Layout title="Log trip — Juice Journal">
			<main class="container">
				<Header month="Log new trip" vehicle={null} />
				<form
					class="trip-form"
					action="/trips"
					method="post"
					hx-post="/trips"
				>
					{/* Row 1: date + daypart */}
					<div class="grid">
						<label>
							Date
							<input
								name="trip_date"
								type="date"
								value={nowDate}
								required
							/>
						</label>
						<fieldset class="daypart-selector">
							<legend>Time of day</legend>
							<label>
								<input
									type="radio"
									name="daypart"
									value="morning"
									checked={defaultDaypart === "morning"}
								/>
								<span class="icon-sun" aria-hidden="true"></span>
							</label>
							<label>
								<input
									type="radio"
									name="daypart"
									value="afternoon"
									checked={defaultDaypart === "afternoon"}
								/>
								<span class="icon-moon" aria-hidden="true"></span>
							</label>
						</fieldset>
					</div>

					{/* Row 2: start + end time */}
					<div class="grid">
						<label>
							Start time
							<input name="start_time" type="time" required />
						</label>
						<label>
							End time
							<input name="end_time" type="time" value={nowTime} required />
						</label>
					</div>

					{/* Row 3: distance + odometer */}
					<div class="grid">
						<label>
							Distance <small>(km)</small>
							<input name="distance_km" type="number" step="0.1" required />
						</label>
						<label>
							Odometer <small>(km)</small>
							<input name="odometer_km" type="number" step="0.1" />
						</label>
					</div>

					{/* Row 4: speed + consumption */}
					<div class="grid">
						<label>
							Avg speed <small>(km/h)</small>
							<input name="avg_speed_kmh" type="number" step="1" />
						</label>
						<label>
							Consumption <small>(kWh/100km)</small>
							<input
								name="avg_consumption_kwh_100km"
								type="number"
								step="0.1"
							/>
						</label>
					</div>

					{/* Row 5: locations */}
					<div class="grid">
						<label>
							Start location
							<select name="start_location_id">
								<option value="">—</option>
								{locations.map((loc) => (
									<option
										value={loc.id}
										selected={loc.id === startLocationId}
									>
										{loc.label}
									</option>
								))}
							</select>
						</label>
						<label>
							End location
							<select name="end_location_id">
								<option value="">—</option>
								{locations.map((loc) => (
									<option
										value={loc.id}
										selected={loc.id === endLocationId}
									>
										{loc.label}
									</option>
								))}
							</select>
						</label>
					</div>

					{/* Row 6: vehicle — full width */}
					<div class="grid grid--full">
						<label>
							Vehicle
							<select name="vehicle_id" required>
								{vehicles.length === 0 && (
									<option value="">No vehicles — add one first</option>
								)}
								{vehicles.map((v) => (
									<option
										value={v.id}
										selected={v.id === defaultVehicleId}
									>
										{v.description}
									</option>
								))}
							</select>
						</label>
					</div>

					{/* Sticky submit bar: Back + Save */}
					<div class="sticky-submit">
						<div class="grid">
							<a href="/" role="button" class="secondary">
								Back
							</a>
							<button type="submit" class="contrast">
								Save trip
							</button>
						</div>
					</div>
				</form>
			</main>
		</Layout>
	)
}
