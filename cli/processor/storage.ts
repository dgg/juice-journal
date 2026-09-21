import { SQL, sql } from "bun"

import type { Daypart, TripData } from "./types"
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
	// odometer not redable form dashboard
}

export const store = async (vehicle: string, trips: TripData[]): Promise<void> => {
	const db = new SQL(DATABASE_URL!)
	const rows: TripRow[] = trips.map((t) => ({
		consumption: t.consumption,
		daypart: t.daypart,
		distance: t.distance,
		duration: t.duration.as("minutes"),
		end_location: t.end.location,
		end_time: t.end.time.toUTC().toISO()!,
		speed: t.speed,
		start_location: t.start.location,
		start_time: t.start.time.toUTC().toISO()!,
		vehicle_id: vehicle,
		weather_end: t.end.weather!,
		weather_start: t.end.weather!
	}))
	await db`INSERT INTO trips ${sql(rows)}`
}
