import type { DateTime, Duration } from "luxon"
import * as z from "zod"
import type { Location, WeatherSnapshot } from "./Weather"

export const START_PATTERN = /(?<hhmm>\d{2}:\d{2})$/

export const ocrResponseSchema = z.object({
	start: z
		.string()
		.regex(START_PATTERN)
		.describe("Start time in hh:mm format, found after 'Today, since'"),
	distance: z
		.number()
		.describe("Distance in km, found before the unit 'km' near the top, not a score"),
	speed: z
		.number()
		.describe(
			"Average speed in km/h, found before the unit 'km/h' near the top; never the Safety or Eco score value"
		),
	consumption: z
		.number()
		.describe("Energy consumption in kWh/100km, found in the Energy Consumption row")
})

export const ocrResponseJsonSchema = { ...ocrResponseSchema.toJSONSchema() }

export type OcrResponse = z.infer<typeof ocrResponseSchema>

export type Daypart = "morning" | "afternoon"

export interface Waypoint {
	time: DateTime
	location: Location
	// weather needs to be set afterwards
	weather?: WeatherSnapshot
}
export interface TripData {
	daypart: Daypart
	start: Waypoint
	end: Waypoint
	duration: Duration
	distance: number
	consumption: number
	speed: number
	// we don't know the odometer from the dashboard pic
}
