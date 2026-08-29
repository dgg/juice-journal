import { Hono } from "hono"
import { zodProblemHook } from "hono-problem-details/zod"
import { zValidator } from "@hono/zod-validator"

import { validateTripInput } from "./validators"

import { tripsQueries, type TripRow } from "../db/queries/trips"

import { tripInputSchema } from "../types"
import type { TripInput, TripCreationRaw } from "../types"

// generic soup workaround
const problemHook = zodProblemHook() as unknown as any

export const apiTrips = new Hono()

	.get("/health", (c) => c.json({ status: "ok" }))

	.post(
		"/trips",
		// validate input schema
		zValidator("json", tripInputSchema, problemHook),
		// validate input consistency
		async (c, next) => {
			const input: TripInput = c.req.valid("json")
			await validateTripInput(input)
			await next()
		},
		// handle creation
		async (c) => {
			const input: TripInput = c.req.valid("json")
			const trip: TripRow = await tripsQueries.createTrip(input)
			const response: TripCreationRaw = {
				id: trip.id,
				vehicle: trip.vehicle_id,
				start: {
					location: trip.start_location_id,
					time: trip.start_time.toISO()!,
					weather: trip.weather_start
				},
				end: {
					location: trip.end_location_id,
					time: trip.end_time.toISO()!,
					weather: trip.weather_end
				},
				daypart: trip.daypart,
				duration: trip.duration,
				distance: trip.distance,
				consumption: trip.consumption,
				odometer: trip.odometer,
				speed: trip.speed,
				tracking: {
					created: trip.tracking_created.toISO()!,
					updated: trip.tracking_updated.toISO()!
				}
			}
			return c.json(response, 201)
		}
	)
