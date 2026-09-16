import type { DateTime, Duration } from "luxon"
import type { Location, WeatherSnapshot } from "./Weather"

export type Daypart = "morning" | "afternoon"

export interface Raw {
	start: string
	end: string
	duration: string
	distance: string
	consumption: string
	speed: string
	odometer: string
}
export interface Waypoint {
	time: DateTime
	location: Location
	weather: WeatherSnapshot
}
export interface Transformed {
	daypart: Daypart
	start: Waypoint
	end: Waypoint
	duration: Duration
	distance: number
	consumption: number
	speed: number
	odometer: number
}

