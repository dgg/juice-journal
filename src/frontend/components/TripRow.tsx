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
			<summary
				style={{
					padding: "1rem",
					display: "flex",
					alignItems: "center",
					gap: "0.75rem",
					cursor: "pointer",
					listStyle: "none"
				}}
			>
				<div class={`daypart-indicator ${daypartClass}`}>{daypartIcon}</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{dateStr}</div>
					<div style={{ fontSize: "0.875rem", color: "var(--pico-muted-color)" }}>
						{timeStr}
					</div>
				</div>
				<div
					style={{
						fontWeight: 600,
						color: "var(--pico-primary)",
						whiteSpace: "nowrap"
					}}
				>
					{consumptionStr}
				</div>
			</summary>
			<div
				style={{
					padding: "0 1rem 1rem 1rem",
					borderTop: "1px solid var(--pico-muted-border-color)"
				}}
			>
				<dl
					style={{
						display: "grid",
						gridTemplateColumns: "auto 1fr",
						gap: "0.25rem 1rem",
						margin: "0.75rem 0 0 0"
					}}
				>
					<dt style={{ color: "var(--pico-muted-color)" }}>
						<small>Distance</small>
					</dt>
					<dd style={{ margin: 0, fontWeight: 500 }}>
						{formatNumber(trip.distanceKm, 1)} km
					</dd>
					<dt style={{ color: "var(--pico-muted-color)" }}>
						<small>Duration</small>
					</dt>
					<dd style={{ margin: 0, fontWeight: 500 }}>
						{trip.durationMin} min
					</dd>
					<dt style={{ color: "var(--pico-muted-color)" }}>
						<small>Avg speed</small>
					</dt>
					<dd style={{ margin: 0, fontWeight: 500 }}>
						{trip.avgSpeedKmh !== null ? formatNumber(trip.avgSpeedKmh, 0) : "--"} km/h
					</dd>
					{trip.odometerKm !== null && (
						<>
							<dt style={{ color: "var(--pico-muted-color)" }}>
								<small>Odometer</small>
							</dt>
							<dd style={{ margin: 0, fontWeight: 500 }}>
								{formatNumber(trip.odometerKm, 1)} km
							</dd>
						</>
					)}
					{trip.startLocation && (
						<>
							<dt style={{ color: "var(--pico-muted-color)" }}>
								<small>From</small>
							</dt>
							<dd style={{ margin: 0, fontWeight: 500 }}>{trip.startLocation}</dd>
						</>
					)}
					{trip.endLocation && (
						<>
							<dt style={{ color: "var(--pico-muted-color)" }}>
								<small>To</small>
							</dt>
							<dd style={{ margin: 0, fontWeight: 500 }}>{trip.endLocation}</dd>
						</>
					)}
				</dl>
			</div>
		</details>
	)
}
