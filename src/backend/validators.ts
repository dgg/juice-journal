import { zValidator } from "@hono/zod-validator"
import type { Context } from "hono"
import { validator } from "hono/validator"
import { ProblemDetailsError } from "hono-problem-details"
import { zodProblemHook } from "hono-problem-details/zod"

import { vehiclesQueries } from "../db/queries/vehicles"
import { locationsQueries } from "../db/queries/locations"
import { tripsQueries } from "../db/queries/trips"

import { tripInputSchema, type TripInput } from "./types"
import { problems } from "./problems"

export const creationValidator = zValidator("json", tripInputSchema, zodProblemHook({}))

export async function validateVehicle(req: TripInput): Promise<TripInput> {
	try {
		const exists = await vehiclesQueries.vehicleExists(req.vehicle_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Vehicle '${req.vehicle_id}' does not exist`,
				extensions: {
					errors: [{ field: "vehicle_id", message: "vehicle does not exist" }]
				}
			})
		}
		return req
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			throw error
		}
		throw problems.create("FOREIGN_KEY_VIOLATION", {
			detail: `Could not verify vehicle '${req.vehicle_id}'`,
			extensions: {
				errors: [{ field: "vehicle_id", message: "verification failed" }]
			}
		})
	}
}

export async function validateStartLocation(req: TripInput): Promise<TripInput> {
	if (!req.start_location_id) {
		return req
	}
	try {
		const exists = await locationsQueries.locationExists(req.start_location_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Start location '${req.start_location_id}' does not exist`,
				extensions: {
					errors: [
						{
							field: "start_location_id",
							message: "start_location does not exist"
						}
					]
				}
			})
		}
		return req
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			throw error
		}
		throw problems.create("FOREIGN_KEY_VIOLATION", {
			detail: `Could not verify start location '${req.start_location_id}'`,
			extensions: {
				errors: [{ field: "start_location_id", message: "verification failed" }]
			}
		})
	}
}

export async function validateEndLocation(req: TripInput): Promise<TripInput> {
	if (!req.end_location_id) {
		return req
	}
	try {
		const exists = await locationsQueries.locationExists(req.end_location_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `End location '${req.end_location_id}' does not exist`,
				extensions: {
					errors: [
						{
							field: "end_location_id",
							message: "end_location does not exist"
						}
					]
				}
			})
		}
		return req
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			throw error
		}
		throw problems.create("FOREIGN_KEY_VIOLATION", {
			detail: `Could not verify end location '${req.end_location_id}'`,
			extensions: {
				errors: [{ field: "end_location_id", message: "verification failed" }]
			}
		})
	}
}

export async function validateTripConflict(req: TripInput): Promise<TripInput> {
	try {
		const exists = await tripsQueries.existsTripByVehicleAndEndTime({
			vehicleId: req.vehicle_id,
			endTime: req.end_time
		})
		if (exists) {
			throw problems.create("TRIP_CONFLICT", {
				detail: `A trip with this vehicle_id and end_time already exists`,
				extensions: { vehicle_id: req.vehicle_id, end_time: req.end_time }
			})
		}
		return req
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			throw error
		}
		throw problems.create("TRIP_CONFLICT", {
			detail: `Could not verify trip uniqueness`,
			extensions: { vehicle_id: req.vehicle_id, end_time: req.end_time }
		})
	}
}

export const vehicleValidator = validator("json", async (req: TripInput) => {
	return validateVehicle(req)
})

export const startLocationValidator = validator("json", async (req: TripInput) => {
	return validateStartLocation(req)
})

export const endLocationValidator = validator("json", async (req: TripInput) => {
	return validateEndLocation(req)
})

export const tripConflictValidator = validator("json", async (req: TripInput) => {
	return validateTripConflict(req)
})
