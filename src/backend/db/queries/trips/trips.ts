import type { DateTime } from "luxon"

import type { TripRow } from "./Insert"

export type TripDetail = Omit<
	TripRow,
	| "start_time"
	| "end_time"
	| "distance"
	| "speed"
	| "consumption"
	| "odometer"
	| "tracking_created"
	| "tracking_updated"
> & {
	start_time: DateTime
	end_time: DateTime
	/** trip distance (KiloM) */
	distance: number
	/* trip average speed (KiloM-PER-HR) */
	speed: number | null
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: number | null
	/** odometer reading (KiloM) */
	odometer: number | null
	tracking_created: DateTime
	tracking_updated: DateTime
}
