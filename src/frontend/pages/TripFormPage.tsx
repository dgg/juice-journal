import type { FC } from "hono/jsx"
import { Layout } from "../Layout"
import { Header } from "../components/Header"
import { StickyCta } from "../components/StickyCta"

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
				<form class="trip-form" action="/trips" method="post" hx-post="/trips">
					{/* Row 1: date + daypart */}
					<div class="grid">
						<label>
							<span class="icon-calendar-days" aria-hidden="true"></span>{" "}
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
								<span class="icon-clock-8" aria-hidden="true"></span>
							</label>
							<label>
								<input
									type="radio"
									name="daypart"
									value="afternoon"
									checked={defaultDaypart === "afternoon"}
									title="Afternoon"
								/>
								<span class="icon-clock-4" aria-hidden="true"></span>
							</label>
						</fieldset>
					</div>

					{/* Row 2: start + end time */}
					<div class="grid">
						<label>
							<span class="icon-clock-arrow-up" aria-hidden="true"></span>{" "}
							Start time
							<input name="start_time" type="time" required />
						</label>
						<label>
							<span class="icon-clock-arrow-down" aria-hidden="true"></span>{" "}
							End time
							<input name="end_time" type="time" value={nowTime} required />
						</label>
					</div>

					{/* Row 3: distance + odometer */}
					<div class="grid">
						<label>
							<span class="icon-route" aria-hidden="true"></span> Distance{" "}
							<small>(km)</small>
							<input name="distance_km" type="number" step="0.1" required />
						</label>
						<label>
							<span class="icon-circle-gauge" aria-hidden="true"></span>{" "}
							Odometer <small>(km)</small>
							<input name="odometer_km" type="number" step="0.1" />
						</label>
					</div>

					{/* Row 4: speed + consumption */}
					<div class="grid">
						<label>
							<span class="icon-gauge" aria-hidden="true"></span>
							Avg speed <small>(km/h)</small>
							<input name="avg_speed_kmh" type="number" step="1" />
						</label>
						<label>
							<span class="icon-ev-charger" aria-hidden="true"></span>{" "}
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
							<span class="icon-flag" aria-hidden="true"></span> Start
							location
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
							<span
								class="icon-flag-triangle-right"
								aria-hidden="true"
							></span>{" "}
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
							<span class="icon-car-front" aria-hidden="true"></span>{" "}
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
					<StickyCta
						actions={[
							{
								href: "/",
								label: "Back",
								variant: "secondary",
								icon: "home"
							},
							{ label: "Save trip", type: "submit", icon: "save-plus" }
						]}
					/>
				</form>
			</main>
		</Layout>
	)
}
