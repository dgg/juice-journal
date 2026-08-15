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
	const daypartIcon = trip.daypart === "morning" ? "icon-clock-8" : "icon-clock-4"

	const consumptionStr =
		trip.avgConsumptionKwh100km !== null
			? `${formatNumber(trip.avgConsumptionKwh100km, 1)} kWh/100km`
			: "--"

	return (
		<details class="trip-row">
			<summary class="trip-row__summary">
				<span class={`daypart-indicator ${daypartClass}`}><span class={daypartIcon} aria-hidden="true"></span></span>
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
					<dt><span class="icon-route" aria-hidden="true"></span> Distance</dt>
					<dd>{formatNumber(trip.distanceKm, 1)} km</dd>
					<dt><span class="icon-hourglass" aria-hidden="true"></span> Duration</dt>
					<dd>{trip.durationMin} min</dd>
					<dt><span class="icon-gauge" aria-hidden="true"></span> Avg speed</dt>
					<dd>
						{trip.avgSpeedKmh !== null
							? formatNumber(trip.avgSpeedKmh, 0)
							: "--"}{" "}
						km/h
					</dd>
					{trip.odometerKm !== null && (
						<>
							<dt><span class="icon-circle-gauge" aria-hidden="true"></span> Odometer</dt>
							<dd>{formatNumber(trip.odometerKm, 1)} km</dd>
						</>
					)}
					{trip.startLocation && (
						<>
							<dt><span class="icon-flag" aria-hidden="true"></span> From</dt>
							<dd>{trip.startLocation}</dd>
						</>
					)}
					{trip.endLocation && (
						<>
							<dt><span class="icon-flag-triangle-right" aria-hidden="true"></span> To</dt>
							<dd>{trip.endLocation}</dd>
						</>
					)}
				</dl>
			</div>
		</details>
	)
}
