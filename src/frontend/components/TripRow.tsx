import type { FC } from "hono/jsx"
import { formatNumber } from "../format"

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

export const TripRow: FC<{ trip: Trip }> = ({ trip }) => {
	const displayTz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
	const dateStr = new Date(trip.endTime).toLocaleDateString("en-US", {
		timeZone: displayTz,
		weekday: "short",
		month: "short",
		day: "numeric"
	})
	const startTimeStr = new Date(trip.startTime).toLocaleTimeString("en-US", {
		timeZone: displayTz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	})
	const endTimeStr = new Date(trip.endTime).toLocaleTimeString("en-US", {
		timeZone: displayTz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	})
	const timeStr = `${startTimeStr} \u2013 ${endTimeStr}`

	const daypartClass = trip.daypart === "morning" ? "morning" : "afternoon"
	const daypartIcon = trip.daypart === "morning" ? "\u2600" : "\u{1F319}"

	const consumptionStr =
		trip.avgConsumptionKwh100km !== null
			? `${formatNumber(trip.avgConsumptionKwh100km, 1)} kWh/100km`
			: "--"

	return (
		<details class="trip-row">
			<summary class="trip-row__summary">
				<span class={`daypart-indicator ${daypartClass}`}>{daypartIcon}</span>
				<div class="trip-row__title">
					<h3>{dateStr}</h3>
					<time
						class="trip-row__time"
						datetime={new Date(trip.startTime).toISOString()}
					>
						{timeStr}
					</time>
				</div>
				<data
					class="trip-row__consumption"
					value={trip.avgConsumptionKwh100km ?? ""}
				>
					{consumptionStr}
				</data>
			</summary>
			<div class="trip-row__body">
				<dl class="trip-snapshot">
					<dt>Distance</dt>
					<dd>{formatNumber(trip.distanceKm, 1)} km</dd>
					<dt>Duration</dt>
					<dd>{trip.durationMin} min</dd>
					<dt>Avg speed</dt>
					<dd>
						{trip.avgSpeedKmh !== null
							? formatNumber(trip.avgSpeedKmh, 0)
							: "--"}{" "}
						km/h
					</dd>
					{trip.odometerKm !== null && (
						<>
							<dt>Odometer</dt>
							<dd>{formatNumber(trip.odometerKm, 1)} km</dd>
						</>
					)}
					{trip.startLocation && (
						<>
							<dt>From</dt>
							<dd>{trip.startLocation}</dd>
						</>
					)}
					{trip.endLocation && (
						<>
							<dt>To</dt>
							<dd>{trip.endLocation}</dd>
						</>
					)}
				</dl>
			</div>
		</details>
	)
}
