import { db } from "../db/client"
import type { Context } from "hono"
import type { TripInput, Trip } from "./types"
import { problems } from "./problems"

export async function creationHandler(c: Context) {
	const input = c.req.valid("json") as TripInput

	// TODO: get conditions from weather api if locations are set
	const weather_start = null
	const weather_end = null

	try {
		const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          start_location_id,
          end_location_id,
          daypart,
          duration_min,
          distance_km,
          avg_speed_kmh,
          avg_consumption_kwh_100km,
          weather_start,
          weather_end,
          odometer_km
        )
        VALUES (
          ${input.vehicle_id},
          ${input.start_time},
          ${input.end_time},
          ${input.start_location_id || null},
          ${input.end_location_id || null},
          ${input.daypart},
          ${input.duration_min},
          ${input.distance_km},
          ${input.avg_speed_kmh || null},
          ${input.avg_consumption_kwh_100km || null},
          ${weather_start},
          ${weather_end},
          ${input.odometer_km || null}
        )
        RETURNING *
      `

		const trip = result[0]

		return c.json(
			{
				id: trip.id,
				vehicle_id: trip.vehicle_id,
				start_time: trip.start_time,
				end_time: trip.end_time,
				start_location_id: trip.start_location_id,
				end_location_id: trip.end_location_id,
				daypart: trip.daypart,
				duration_min: trip.duration_min,
				distance_km: trip.distance_km,
				avg_speed_kmh: trip.avg_speed_kmh,
				avg_consumption_kwh_100km: trip.avg_consumption_kwh_100km,
				weather_start: trip.weather_start,
				weather_end: trip.weather_end,
				odometer_km: trip.odometer_km,
				tracking_created: trip.tracking_created,
				tracking_updated: trip.tracking_updated
			},
			201
		)
	} catch (error: unknown) {
		const errorMsg = String(error)

		// Check for UNIQUE constraint violation
		if (
			errorMsg.includes("duplicate key") ||
			errorMsg.includes("UNIQUE") ||
			errorMsg.includes("unique")
		) {
			throw problems.create("TRIP_CONFLICT", {
				detail: `A trip with this vehicle_id and end_time already exists`,
				instance: `/api/trips`,
				extensions: { vehicle_id: input.vehicle_id, end_time: input.end_time }
			})
		}

		throw error
	}
}

export async function getTrips(c: Context) {
	// Get current month in display timezone
	const DISPLAY_TZ = process.env.DISPLAY_TZ || "Europe/Copenhagen"

	// Get today's date in display timezone
	const today = new Date()
	const formatter = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: DISPLAY_TZ
	})

	const parts = formatter.formatToParts(today)
	const year = parseInt(parts.find((p) => p.type === "year")?.value || "2026", 10)
	const month = parseInt(parts.find((p) => p.type === "month")?.value || "01", 10)

	// Month start in display timezone: 1st day at 00:00
	const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00`)

	// Month end in display timezone: 1st day of next month at 00:00
	const nextMonth = new Date(year, month, 1)
	const monthEnd = new Date(
		nextMonth.getFullYear(),
		nextMonth.getMonth(),
		nextMonth.getDate(),
		0,
		0,
		0
	)

	// Convert to UTC for database query
	// This is a simplified approach - in production you'd want to use proper timezone math
	const startUTC = monthStart.toISOString()
	const endUTC = monthEnd.toISOString()

	const trips = await db`
      SELECT * FROM trips
      WHERE end_time >= ${startUTC}
        AND end_time < ${endUTC}
      ORDER BY end_time DESC
    `

	const formattedTrips = trips.map((trip) => ({
		id: trip.id,
		vehicle_id: trip.vehicle_id,
		start_time: trip.start_time,
		end_time: trip.end_time,
		start_location_id: trip.start_location_id,
		end_location_id: trip.end_location_id,
		daypart: trip.daypart,
		duration_min: trip.duration_min,
		distance_km: trip.distance_km,
		avg_speed_kmh: trip.avg_speed_kmh,
		avg_consumption_kwh_100km: trip.avg_consumption_kwh_100km,
		weather_start: trip.weather_start,
		weather_end: trip.weather_end,
		odometer_km: trip.odometer_km,
		tracking_created: trip.tracking_created,
		tracking_updated: trip.tracking_updated
	}))

	return c.json(formattedTrips, 200)
}
