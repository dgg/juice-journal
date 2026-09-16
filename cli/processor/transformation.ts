import { DateTime, Duration, type DateObjectUnits } from "luxon"
import type { PicName } from "./PicName"
import {
	START_PATTERN,
	type Daypart,
	type OcrResponse,
	type TripData,
	type Waypoint
} from "./types"
import type { Location } from "./Weather"

export const transformer = (name: PicName, response: OcrResponse): TripData => {
	const endTime = name.date
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

	return {
		daypart,
		consumption: response.consumption,
		distance: response.distance,
		duration: endTime.diff(startTime),
		end,
		speed: response.speed,
		start
	}
}
