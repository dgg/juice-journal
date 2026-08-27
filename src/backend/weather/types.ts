import type { DateTime } from "luxon"

export interface WeatherLocation {
	latitude: number
	longitude: number
}
export interface WeatherParam {
	location: WeatherLocation
	time: DateTime
}
export type WeatherSource = "forecast" | "archive"
