import type { DateTime } from "luxon"

import type { Daypart, Raw, Transformed, Waypoint } from "./types"
import { parseDateTime, parseDuration } from "./parsing"
import type { Location, Weather } from "./Weather"

export const transformer = (weather: Weather, data: Raw): Transformed => {
	const startTime: DateTime = parseDateTime(data.start)
	const daypart: Daypart = startTime.hour < 13 ? "morning" : "afternoon"
	const locations: [Location, Location] =
		daypart === "morning" ? ["home", "work"] : ["work", "home"]
	const start: Waypoint = {
		location: locations[0],
		time: startTime,
		weather: weather.getWeather(locations[0], startTime)
	}
	const endTime = parseDateTime(data.end)
	const end: Waypoint = {
		location: locations[1],
		time: endTime,
		weather: weather.getWeather(locations[1], endTime)
	}

	return {
		daypart,
		consumption: parseFloat(data.consumption),
		distance: parseFloat(data.distance),
		duration: parseDuration(data.duration),
		end,
		odometer: parseInt(data.odometer),
		speed: parseFloat(data.speed),
		start
	}
}
