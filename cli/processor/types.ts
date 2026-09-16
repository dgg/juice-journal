import type { DateTime, Duration } from "luxon"
import * as z from "zod"
import type { Location, WeatherSnapshot } from "./Weather"

export const START_PATTERN = /(?<hhmm>\d{2}:\d{2})$/

export const ocrResponseSchema = z.object({
	distance: z.number(),
	speed: z.number(),
	consumption: z.number(),
	start: z
		.string()
		.regex(START_PATTERN)
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
