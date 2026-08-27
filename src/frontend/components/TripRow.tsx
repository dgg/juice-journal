import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { weatherCodeToIcon, windDirectionToClass } from "../weather/display"

interface WeatherData {
	weatherCode: number | null
	temperature: number | null
	humidity: number | null
	precipitation: number | null
	wind: {
		speed: number | null
		direction: number | null
	}
}

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
	weatherStart: object | null
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
			? formatNumber(trip.avgConsumptionKwh100km, 1)
			: "--"

	return (
		<details class="trip-row">
			<summary class="trip-row__summary">
				<span class={`daypart-indicator ${daypartClass}`}>
					<span class={daypartIcon} aria-hidden="true"></span>
				</span>
				<div class="trip-row__title">
					<h3>{dateStr}</h3>
					<small>
						<time
							class="trip-row__time"
							datetime={new Date(trip.startTime).toISOString()}
						>
							{timeStr}
						</time>
					</small>
				</div>
				<div class="trip-row__consumption">
					<data value={trip.avgConsumptionKwh100km ?? ""}>
						{consumptionStr}
					</data>
					<small>&nbsp;kWh/100km</small>
				</div>
			</summary>
			<div class="trip-row__body">
				<dl class="trip-detail-pills">
					<dt class="sr-only">Distance</dt>
					<dd class="trip-detail-pill">
						<span class="icon-route" aria-hidden="true"></span>
						<data value={trip.distanceKm}>
							{formatNumber(trip.distanceKm, 1)}
						</data>
						<small class="pill__unit">km</small>
					</dd>
					<dt class="sr-only">Duration</dt>
					<dd class="trip-detail-pill">
						<span class="icon-hourglass" aria-hidden="true"></span>
						<data value={trip.durationMin}>
							{trip.durationMin}
							<small class="pill__unit">&nbsp;min</small>
						</data>
					</dd>
					{trip.avgSpeedKmh !== null && (
						<>
							<dt class="sr-only">Avg speed</dt>
							<dd class="trip-detail-pill">
								<span class="icon-gauge" aria-hidden="true"></span>
								<data value={trip.avgSpeedKmh}>
									{formatNumber(trip.avgSpeedKmh, 0)}
									<small class="pill__unit">&nbsp;km/h</small>
								</data>
							</dd>
						</>
					)}
					{trip.odometerKm !== null && (
						<>
							<dt class="sr-only">Odometer</dt>
							<dd class="trip-detail-pill">
								<span class="icon-circle-gauge" aria-hidden="true"></span>
								<data value={trip.odometerKm}>
									{formatNumber(trip.odometerKm, 1)}
									<small class="pill__unit">&nbsp;km</small>
								</data>
							</dd>
						</>
					)}
					{trip.startLocation || trip.endLocation ? (
						<>
							<dt class="sr-only">Route</dt>
							<dd class="trip-detail-pill">
								{trip.startLocation && (
									<span class="icon-flag" aria-hidden="true"></span>
								)}
								{trip.startLocation}
								{trip.startLocation && trip.endLocation && (
									<span
										class="icon-circle-arrow-right"
										aria-hidden="true"
									></span>
								)}
								{trip.endLocation}
								{trip.endLocation && (
									<span
										class="icon-flag-triangle-right"
										aria-hidden="true"
									></span>
								)}
							</dd>
						</>
					) : null}
					{trip.weatherStart &&
						(() => {
							const w = trip.weatherStart as WeatherData
							const windClass = windDirectionToClass(w.wind.direction)
							return (
								<>
									<dt class="sr-only">Weather</dt>
									<dd class="trip-detail-pill">
										<span
											class={weatherCodeToIcon(w.weatherCode)}
											aria-hidden="true"
										></span>
										<data value={w.temperature ?? ""}>
											{formatNumber(w.temperature, 0)}
											<span class="pill__unit">°</span>
										</data>
										<span
											class="icon-umbrella"
											aria-hidden="true"
										></span>
										<data value={w.precipitation ?? ""}>
											{formatNumber(w.precipitation, 1)}
											<small class="pill__unit">&nbsp;mm</small>
										</data>
										<span
											class="icon-droplets"
											aria-hidden="true"
										></span>
										<data value={w.humidity ?? ""}>
											{formatNumber(w.humidity, 0)}
											<small class="pill__unit">%</small>
										</data>
										<span class="icon-wind" aria-hidden="true"></span>
										{windClass && (
											<span
												class={`icon-mouse-pointer-2 ${windClass}`}
												aria-hidden="true"
											></span>
										)}
										<data value={w.wind.speed ?? ""}>
											{formatNumber(w.wind.speed, 0)}
											<small class="pill__unit">&nbsp;m/s</small>
										</data>
									</dd>
								</>
							)
						})()}
				</dl>
			</div>
		</details>
	)
}
