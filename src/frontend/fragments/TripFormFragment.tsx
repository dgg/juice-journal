import type { FC } from "hono/jsx"

import { StickyCta } from "../components/StickyCta"

import type { Daypart, Location } from "../../backend/types"
import type { TripForm, TripFormIssues, TripFormRaw } from "../../backend/presentation/types"

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
	form?: TripFormRaw
	issues?: TripFormIssues
}

const fv = (
	key: keyof TripFormRaw,
	fallback: string | undefined,
	form?: TripFormRaw
): string | undefined => form?.[key] ?? fallback

const fe = (
	key: keyof TripFormRaw,
	issues?: TripFormIssues
): string | undefined => issues?.[key]

function inputProps(
	name: keyof TripFormRaw,
	fallback: string | undefined,
	form?: TripFormRaw,
	issues?: TripFormIssues
) {
	const val = fv(name, fallback, form)
	const e = fe(name, issues)
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
	issues,
	form
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
			{issues?.vehicle_id && <small id="vehicle_id-err">{issues.vehicle_id}</small>}

			{/* Row 1: date + daypart */}
			<div class="grid grid--daypart">
				<label>
					<span class="icon-calendar-days" aria-hidden="true"></span> Date
					<input
						name="trip_date"
						type="date"
						{...inputProps("trip_date", nowDate, form, issues)}
						required
					/>
					{fe("trip_date", issues) && (
						<small id="trip_date-err">{issues!.trip_date}</small>
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
									form
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
									form
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
						{...inputProps("start_time", undefined, form, issues)}
						required
					/>
					{fe("start_time", issues) && (
						<small id="start_time-err">{issues!.start_time}</small>
					)}
				</label>
				<label>
					<span class="icon-clock-arrow-down" aria-hidden="true"></span> End
					time
					<input
						name="end_time"
						type="time"
						{...inputProps("end_time", nowTime, form, issues)}
						required
					/>
					{fe("end_time", issues) && (
						<small id="end_time-err">{issues!.end_time}</small>
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
						{...inputProps("distance", undefined, form, issues)}
					/>
					{fe("distance", issues) && (
						<small id="distance-err">{issues!.distance}</small>
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
						{...inputProps("odometer", undefined, form, issues)}
					/>
					{fe("odometer", issues) && (
						<small id="odometer-err">{issues!.odometer}</small>
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
						{...inputProps("speed", undefined, form, issues)}
					/>
					{fe("speed", issues) && <small id="speed-err">{issues!.speed}</small>}
				</label>
				<label>
					<span class="icon-ev-charger" aria-hidden="true"></span> Efficiency{" "}
					<small data-tooltip="qudt_:KiloW-HR-PER-HUNDRED-KiloM">
						(kWh/100km)
					</small>
					<input
						name="consumption"
						type="number"
						step="0.1"
						min="0"
						{...inputProps("consumption", undefined, form, issues)}
					/>
					{fe("consumption", issues) && (
						<small id="consumption-err">{issues!.consumption}</small>
					)}
				</label>
			</div>

			{/* Row 5: locations */}
			<div class="grid">
				<label>
					<span class="icon-flag" aria-hidden="true"></span> Start location
					<select
						name="start_location"
						aria-invalid={fe("start_location", issues) ? "true" : undefined}
						aria-describedby={
							fe("start_location", issues)
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
									form
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
									form
								) === "work"
							}
						>
							work
						</option>
					</select>
					{fe("start_location", issues) && (
						<small id="start_location-err">{issues!.start_location}</small>
					)}
				</label>
				<label>
					<span class="icon-flag-triangle-right" aria-hidden="true"></span> End
					location
					<select
						name="end_location"
						aria-invalid={fe("end_location", issues) ? "true" : undefined}
						aria-describedby={
							fe("end_location", issues) ? "end_location-err" : undefined
						}
					>
						<option value="">—</option>
						<option
							value="home"
							selected={
								fv("end_location", endLocation as string, form) ===
								"home"
							}
						>
							home
						</option>
						<option
							value="work"
							selected={
								fv("end_location", endLocation as string, form) ===
								"work"
							}
						>
							work
						</option>
					</select>
					{fe("end_location", issues) && (
						<small id="end_location-err">{issues!.end_location}</small>
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
						aria-invalid={fe("vehicle_id", issues) ? "true" : undefined}
						aria-describedby={
							fe("vehicle_id", issues) ? "vehicle_id-err" : undefined
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
										form
									) === v.id
								}
							>
								{v.description}
							</option>
						))}
					</select>
					{fe("vehicle_id", issues) && (
						<small id="vehicle_id-err">{issues!.vehicle_id}</small>
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
