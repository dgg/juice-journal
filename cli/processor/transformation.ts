import { DateTime, Duration, type DateObjectUnits } from "luxon"
import type { Logger } from "pino"

import type { Picture } from "./Picture"
import type { Location } from "./Weather"

import {
	START_PATTERN,
	type Daypart,
	type OcrResponse,
	type TripData,
	type Waypoint
} from "./types"

export const transformer = (
	logger: Logger,
	picture: Picture,
	response: OcrResponse
): TripData => {
	const endTime = picture.date
	const hhmm = response.start.match(START_PATTERN)!.groups!["hhmm"]!
	const startHour = Duration.fromISOTime(hhmm)

	const dateObj: DateObjectUnits = {
		year: endTime.year,
		month: endTime.month,
		day: endTime.day,
		hour: startHour.hours,
		minute: startHour.minutes
	}

	// dashboard time is local
	const startTime: DateTime = DateTime.fromObject(dateObj, {
		zone: "Europe/Copenhagen"
	})
	const daypart: Daypart = startTime.hour < 13 ? "morning" : "afternoon"
	const locations: [Location, Location] =
		daypart === "morning" ? ["home", "work"] : ["work", "home"]
	const start: Waypoint = {
		location: locations[0],
		time: startTime
		// can't set the weather just yet
	}

	const end: Waypoint = {
		location: locations[1],
		time: endTime
		// can't set the weather just yet
	}

	const duration = endTime.diff(startTime)

	logger.info(
		{ daypart, start, end, duration: duration.as("minutes") },
		"information transformed"
	)

	return {
		daypart,
		consumption: response.consumption,
		distance: response.distance,
		duration,
		end,
		speed: response.speed,
		start
	}
}
