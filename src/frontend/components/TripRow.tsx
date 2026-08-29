import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { weatherCodeToIcon, windDirectionToClass } from "../weather/display"
import type { TripWithLocationRow } from "../../backend/db/queries/trips"
import type { WeatherSnapshot } from "../../backend/weather/types"

export const TripRow: FC<{ trip: TripWithLocationRow }> = ({ trip }) => {
	const displayTz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
	const dateStr = trip.end_time.setZone(displayTz).toFormat("EEE, MMM d")
	const startTimeStr = trip.start_time.setZone(displayTz).toFormat("HH:mm")
	const endTimeStr = trip.end_time.setZone(displayTz).toFormat("HH:mm")
	const timeStr = `${startTimeStr} \u2013 ${endTimeStr}`

	const daypartClass: string = trip.daypart
	const daypartIcon = trip.daypart === "morning" ? "icon-clock-8" : "icon-clock-4"

	const consumptionStr =
		trip.consumption !== null
			? formatNumber(trip.consumption, 1)
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
							datetime={trip.start_time.toISO() ?? undefined}
						>
							{timeStr}
						</time>
					</small>
				</div>
				<div class="trip-row__consumption">
					<data value={String(trip.consumption ?? "")}>
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
						<data value={trip.distance}>
							{formatNumber(trip.distance, 1)}
						</data>
						<small class="pill__unit">km</small>
					</dd>
					<dt class="sr-only">Duration</dt>
					<dd class="trip-detail-pill">
						<span class="icon-hourglass" aria-hidden="true"></span>
						<data value={trip.duration}>
							{trip.duration}
							<small class="pill__unit">&nbsp;min</small>
						</data>
					</dd>
					{trip.speed !== null && (
						<>
							<dt class="sr-only">Avg speed</dt>
							<dd class="trip-detail-pill">
								<span class="icon-gauge" aria-hidden="true"></span>
								<data value={trip.speed}>
									{formatNumber(trip.speed, 0)}
									<small class="pill__unit">&nbsp;km/h</small>
								</data>
							</dd>
						</>
					)}
					{trip.odometer !== null && (
						<>
							<dt class="sr-only">Odometer</dt>
							<dd class="trip-detail-pill">
								<span class="icon-circle-gauge" aria-hidden="true"></span>
								<data value={trip.odometer}>
									{formatNumber(trip.odometer, 1)}
									<small class="pill__unit">&nbsp;km</small>
								</data>
							</dd>
						</>
					)}
					{trip.start_location || trip.end_location ? (
						<>
							<dt class="sr-only">Route</dt>
							<dd class="trip-detail-pill">
								{trip.start_location && (
									<span class="icon-flag" aria-hidden="true"></span>
								)}
								{trip.start_location}
								{trip.start_location && trip.end_location && (
									<span
										class="icon-circle-arrow-right"
										aria-hidden="true"
									></span>
								)}
								{trip.end_location}
								{trip.end_location && (
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
							const w = trip.weatherStart
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
