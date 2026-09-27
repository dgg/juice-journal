import type { Daypart } from "../../../types"

export interface TripRow {
	id: string
	end_time: Date
	daypart: Daypart
	distance: string
	duration: number
	speed: string | null
	consumption: string | null
}
