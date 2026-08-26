import { tripsQueries } from "../db/queries/trips"
import { displayTz, currentMonthBoundsUtc } from "../utils/dates"
import type { Context } from "hono"
import type { TripInput } from "./types"
import type { Env } from "../utils/logger"

export async function creationHandler(c: Context) {
	const input = c.req.valid("json") as TripInput

	const trip = await tripsQueries.createTrip(input)

	return c.json(
		{
			id: trip.id,
			vehicle_id: trip.vehicle_id,
			start_time: trip.start_time.toISO(),
			end_time: trip.end_time.toISO(),
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
			tracking_created: trip.tracking_created.toISO(),
			tracking_updated: trip.tracking_updated.toISO()
		},
		201
	)
}

export async function getTrips(c: Context<Env>) {
	const displayTz_ = displayTz()

	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz_)

	c.var.logger.info(
		"Fetching trips for month [%s .. %s] (display tz: %s)",
		startUtc.toISO(),
		endUtc.toISO(),
		displayTz_
	)

	const trips = await tripsQueries.findTripsByMonth({ startUtc, endUtc })

	return c.json(
		trips.map((trip) => ({
			id: trip.id,
			vehicle_id: trip.vehicle_id,
			start_time: trip.start_time.toISO(),
			end_time: trip.end_time.toISO(),
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
			tracking_created: trip.tracking_created.toISO(),
			tracking_updated: trip.tracking_updated.toISO()
		})),
		200
	)
}
