import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { TripDetailPills } from "./TripDetailPills"
import type { TripSnapshot } from "../../backend/db/queries/trips/FindTrips"

export const TripRow: FC<{ trip: TripSnapshot }> = ({ trip }) => {
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
					<TripDetailPills trip={trip} />
				</div>
		</details>
	)
}
