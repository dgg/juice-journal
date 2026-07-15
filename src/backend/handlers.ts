import { db } from "../db/client"
import { resolveDisplayTz, currentMonthBoundsUtc } from "../utils/dates"
import type { Context } from "hono"
import type { TripInput, Trip } from "./types"
import type { Env } from "../utils/logger"

export async function creationHandler(c: Context) {
	const input = c.req.valid("json") as TripInput

	// TODO: get conditions from weather api if locations are set
	const weather_start = null
	const weather_end = null

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
}

export async function getTrips(c: Context<Env>) {
	// Resolve display timezone using config (location timezones could be fetched if needed in future)
	const displayTz = resolveDisplayTz(
		undefined, // end_location.timezone could be fetched if we had a trips sample first
		undefined, // start_location.timezone could be fetched if we had a trips sample first
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)

	// Compute month bounds in display timezone, converted to UTC for query
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz)

	c.var.logger.info(
		"Fetching trips for month [%s .. %s] (display tz: %s)",
		startUtc,
		endUtc,
		displayTz
	)

	const trips = await db`
      SELECT * FROM trips
      WHERE end_time >= ${startUtc}
        AND end_time < ${endUtc}
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
