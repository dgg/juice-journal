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

export interface WeatherSnapshot {
	observedAt: DateTime
	weatherCode: number | null
	/** qudt:ThermodynamicTemperature:DEG_C */
	temperature: number | null
	/** qudt:RelativeHumidity:PERCENT */
	humidity: number | null
	/** qudt:Length:MILLI-M */
	precipitation: number | null
	wind: {
		/** qudt:LinearVelocity:M-PER-SEC */
		speed: number | null
		/** qudt:PositivePlaneAngle:DEG */
		direction: number | null
	}
}
