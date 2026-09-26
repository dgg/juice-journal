import { Hono } from "hono"
import { problemDetailsHandler } from "hono-problem-details"
import { zodProblemHook } from "hono-problem-details/zod"
import { zValidator } from "@hono/zod-validator"

import { validateTripInput } from "./validators"

import type { TripDetail } from "../db/queries/trips/trips"

import { tripInputSchema } from "../types"
import type { TripInput, TripCreationRaw } from "../types"

import { apiAuth } from "./auth/api-auth"
import { Insert } from "../db/queries/trips/Insert"

// generic soup workaround
const problemHook = zodProblemHook() as unknown as any

export const apiTrips = new Hono()
	.onError(
		problemDetailsHandler({
			autoInstance: true,
			includeStack: process.env.NODE_ENV !== "production",
			defaultType: "about:blank"
		})
	)
	.get("/health", (c) => c.json({ status: "ok" }))

	// All routes below /health require bearer auth
	.use("/*", apiAuth)
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
			const trip: TripDetail = await new Insert(input).execute()
			const response: TripCreationRaw = {
				id: trip.id,
				vehicle: trip.vehicle_id,
				start: {
					location: trip.start_location,
					time: trip.start_time.toISO()!,
					weather: trip.weather_start
				},
				end: {
					location: trip.end_location,
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
