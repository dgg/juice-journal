import type { FC } from "hono/jsx"
import { StickyCta } from "../components/StickyCta"
import type { Daypart, Location } from "../../backend/types"

interface VehicleOption {
	id: string
	description: string
}

interface TripFormFragmentProps {
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

const fv = (
	key: string,
	fallback: string | undefined,
	submitted?: Record<string, string>
): string | undefined => submitted?.[key] ?? fallback

const fe = (key: string, errors?: Record<string, string>): string | undefined =>
	errors?.[key]

function inputProps(
	name: string,
	fallback: string | undefined,
	submitted?: Record<string, string>,
	errors?: Record<string, string>
) {
	const val = fv(name, fallback, submitted)
	const e = fe(name, errors)
	return {
		value: val,
		"aria-invalid": e ? ("true" as const) : undefined,
		"aria-errormessage": e ? `${name}-err` : undefined
	}
}

export const TripFormFragment: FC<TripFormFragmentProps> = ({
	nowDate,
	nowTime,
	defaultDaypart,
	startLocation,
	endLocation,
	vehicles,
	defaultVehicleId,
	errors,
	submitted
}) => {
	return (
		<form
			class="trip-form"
			action="/trips"
			method="post"
			hx-post="/trips"
			hx-target="this"
			hx-swap="outerHTML"
			hx-disabled-elt="button"
		>
			{errors?.vehicle_id && <small id="vehicle_id-err">{errors.vehicle_id}</small>}

			{/* Row 1: date + daypart */}
			<div class="grid grid--daypart">
				<label>
					<span class="icon-calendar-days" aria-hidden="true"></span> Date
					<input
						name="trip_date"
						type="date"
						{...inputProps("trip_date", nowDate, submitted, errors)}
						required
					/>
					{fe("trip_date", errors) && (
						<small id="trip_date-err">{errors!.trip_date}</small>
					)}
				</label>
				<fieldset class="daypart-selector">
					<legend>Time of day</legend>
					<label>

						<input
							type="radio"
							name="daypart"
							value="morning"
							checked={
								fv(
									"daypart",
									defaultDaypart === "morning" ? "morning" : undefined,
									submitted
								) === "morning"
							}
						/>
						<span class="icon-clock-8" aria-hidden="true"></span>
					</label>
					<label>
						<input
							type="radio"
							name="daypart"
							value="afternoon"
							checked={
								fv(
									"daypart",
									defaultDaypart === "afternoon"
										? "afternoon"
										: undefined,
									submitted
								) === "afternoon"
							}
							title="Afternoon"
						/>
						<span class="icon-clock-4" aria-hidden="true"></span>
					</label>
				</fieldset>
			</div>

			{/* Row 2: start + end time */}
			<div class="grid">
				<label>
					<span class="icon-clock-arrow-up" aria-hidden="true"></span> Start
					time
					<input
						name="start_time"
						type="time"
						{...inputProps("start_time", undefined, submitted, errors)}
						required
					/>
					{fe("start_time", errors) && (
						<small id="start_time-err">{errors!.start_time}</small>
					)}
				</label>
				<label>
					<span class="icon-clock-arrow-down" aria-hidden="true"></span> End
					time
					<input
						name="end_time"
						type="time"
						{...inputProps("end_time", nowTime, submitted, errors)}
						required
					/>
					{fe("end_time", errors) && (
						<small id="end_time-err">{errors!.end_time}</small>
					)}
				</label>
			</div>

			{/* Row 3: distance + odometer */}
			<div class="grid">
				<label>
					<span class="icon-route" aria-hidden="true"></span> Distance{" "}
					<small data-tooltip="qudt:KiloM">(km)</small>
					<input
						name="distance"
						type="number"
						step="0.1"
						required
						min="0"
						{...inputProps("distance", undefined, submitted, errors)}
					/>
					{fe("distance", errors) && (
						<small id="distance-err">{errors!.distance}</small>
					)}
				</label>
				<label>
					<span class="icon-circle-gauge" aria-hidden="true"></span> Odometer{" "}
					<small data-tooltip="qudt:KiloM">(km)</small>
					<input
						name="odometer"
						type="number"
						step="0.1"
						min="0"
						{...inputProps("odometer", undefined, submitted, errors)}
					/>
					{fe("odometer", errors) && (
						<small id="odometer-err">{errors!.odometer}</small>
					)}
				</label>
			</div>

			{/* Row 4: speed + consumption */}
			<div class="grid">
				<label>
					<span class="icon-gauge" aria-hidden="true"></span>
					Avg speed <small data-tooltip="qudt:KiloM-PER-HR">(km/h)</small>
					<input
						name="speed"
						type="number"
						step="1"
						min="0"
						{...inputProps("speed", undefined, submitted, errors)}
					/>
					{fe("speed", errors) && <small id="speed-err">{errors!.speed}</small>}
				</label>
				<label>
					<span class="icon-ev-charger" aria-hidden="true"></span> Consumption{" "}
					<small data-tooltip="qudt_:KiloW-HR-PER-HUNDRED-KiloM">
						(kWh/100km)
					</small>
					<input
						name="consumption"
						type="number"
						step="0.1"
						min="0"
						{...inputProps("consumption", undefined, submitted, errors)}
					/>
					{fe("consumption", errors) && (
						<small id="consumption-err">{errors!.consumption}</small>
					)}
				</label>
			</div>

			{/* Row 5: locations */}
			<div class="grid">
				<label>
					<span class="icon-flag" aria-hidden="true"></span> Start location
					<select
						name="start_location"
						aria-invalid={fe("start_location", errors) ? "true" : undefined}
						aria-describedby={
							fe("start_location", errors)
								? "start_location-err"
								: undefined
						}
					>
						<option value="">—</option>
						<option
							value="home"
							selected={
								fv(
									"start_location",
									startLocation as string,
									submitted
								) === "home"
							}
						>
							home
						</option>
						<option
							value="work"
							selected={
								fv(
									"start_location",
									startLocation as string,
									submitted
								) === "work"
							}
						>
							work
						</option>
					</select>
					{fe("start_location", errors) && (
						<small id="start_location-err">{errors!.start_location}</small>
					)}
				</label>
				<label>
					<span class="icon-flag-triangle-right" aria-hidden="true"></span> End
					location
					<select
						name="end_location"
						aria-invalid={fe("end_location", errors) ? "true" : undefined}
						aria-describedby={
							fe("end_location", errors) ? "end_location-err" : undefined
						}
					>
						<option value="">—</option>
						<option
							value="home"
							selected={
								fv("end_location", endLocation as string, submitted) ===
								"home"
							}
						>
							home
						</option>
						<option
							value="work"
							selected={
								fv("end_location", endLocation as string, submitted) ===
								"work"
							}
						>
							work
						</option>
					</select>
					{fe("end_location", errors) && (
						<small id="end_location-err">{errors!.end_location}</small>
					)}
				</label>
			</div>

			{/* Row 6: vehicle — full width */}
			<div class="grid grid--full">
				<label>
					<span class="icon-car-front" aria-hidden="true"></span> Vehicle
					<select
						name="vehicle_id"
						required
						aria-invalid={fe("vehicle_id", errors) ? "true" : undefined}
						aria-describedby={
							fe("vehicle_id", errors) ? "vehicle_id-err" : undefined
						}
					>
						{vehicles.length === 0 && (
							<option value="">No vehicles — add one first</option>
						)}
						{vehicles.map((v) => (
							<option
								value={v.id}
								selected={
									fv(
										"vehicle_id",
										defaultVehicleId ?? undefined,
										submitted
									) === v.id
								}
							>
								{v.description}
							</option>
						))}
					</select>
					{fe("vehicle_id", errors) && (
						<small id="vehicle_id-err">{errors!.vehicle_id}</small>
					)}
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
	)
}
