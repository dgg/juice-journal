import { SQL, sql } from "bun"

import type { Daypart, Transformed } from "./types"
import type { Location, WeatherSnapshot } from "./Weather"

const DATABASE_URL = process.env.DATABASE_URL

interface TripRow {
	vehicle_id: string
	start_time: string
	end_time: string
	start_location: Location
	end_location: Location
	daypart: Daypart
	/** trip duration (MIN) */
	duration: number
	/** trip distance (KiloM) */
	distance: number
	/* trip average speed (KiloM-PER-HR) */
	speed: number | null
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: number | null
	weather_start: WeatherSnapshot | null
	weather_end: WeatherSnapshot | null
	/** odometer reading (KiloM) */
	odometer: number | null
}

export const store = async (vehicle: string, trips: Transformed[]): Promise<number> => {
	const db = new SQL(DATABASE_URL!)
	const rows: TripRow[] = trips.map((t) => ({
		consumption: t.consumption,
		daypart: t.daypart,
		distance: t.distance,
		duration: t.duration.as("minutes"),
		end_location: t.end.location,
		end_time: t.end.time.toUTC().toISO()!,
		odometer: t.odometer,
		speed: t.speed,
		start_location: t.start.location,
		start_time: t.start.time.toUTC().toISO()!,
		vehicle_id: vehicle,
		weather_end: t.end.weather,
		weather_start: t.end.weather
	}))
	const inserted = await db`INSERT INTO trips ${sql(rows)}`
	console.log("inserted", inserted)
	return 0
}
