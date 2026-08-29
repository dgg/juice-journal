import { ProblemDetailsError } from "hono-problem-details"

import { vehiclesQueries } from "../db/queries/vehicles"
import { locationsQueries } from "../db/queries/locations"
import { tripsQueries } from "../db/queries/trips"

import type { TripInput } from "../types"

import { problems } from "../problems"

export async function validateVehicle(req: TripInput): Promise<void> {
	try {
		const exists = await vehiclesQueries.vehicleExists(req.vehicle_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Vehicle '${req.vehicle_id}' does not exist`,
				extensions: {
					errors: [
						{
							field: "vehicle_id",
							message: "does not exist",
							value: req.vehicle_id
						}
					]
				}
			})
		}
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

export async function validateStartLocation(req: TripInput): Promise<void> {
	if (!req.start_location_id) return
	try {
		const exists = await locationsQueries.locationExists(req.start_location_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Start location '${req.start_location_id}' does not exist`,
				extensions: {
					errors: [
						{
							field: "start_location_id",
							message: "does not exist",
							value: req.start_location_id
						}
					]
				}
			})
		}
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

export async function validateEndLocation(req: TripInput): Promise<void> {
	if (!req.end_location_id) return
	try {
		const exists = await locationsQueries.locationExists(req.end_location_id)
		if (!exists) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `End location '${req.end_location_id}' does not exist`,
				extensions: {
					errors: [
						{
							field: "end_location_id",
							message: "does not exist",
							value: req.end_location_id
						}
					]
				}
			})
		}
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

export async function validateTripConflict(req: TripInput): Promise<void> {
	try {
		const exists = await tripsQueries.existsTripByVehicleAndEndTime({
			vehicleId: req.vehicle_id,
			endTime: req.end_time
		})
		if (exists) {
			throw problems.create("TRIP_CONFLICT", {
				detail: `A trip with this vehicle_id and end_time already exists`,
				extensions: {
					errors: [
						{
							field: "vehicle_id",
							value: req.vehicle_id
						},
						{
							field: "end_time",
							value: req.end_time
						}
					]
				}
			})
		}
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

export async function validateOdometer(req: TripInput): Promise<void> {
	if (req.odometer === undefined) return
	try {
		const latest = await tripsQueries.findLatestOdometerForVehicle(req.vehicle_id)
		if (latest !== null && req.odometer < latest) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Odometer reading ${req.odometer} is lower than the previous reading ${latest}`,
				extensions: {
					errors: [
						{
							field: "odometer",
							message:
								"odometer reading cannot be lower than the previous reading",
							value: req.odometer
						}
					]
				}
			})
		}
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			throw error
		}
		throw problems.create("FOREIGN_KEY_VIOLATION", {
			detail: `Could not verify odometer reading for vehicle '${req.vehicle_id}'`,
			extensions: {
				errors: [{ field: "odometer", message: "verification failed" }]
			}
		})
	}
}

export const validateTripInput = async (input: TripInput): Promise<void> => {
	await validateVehicle(input)
	await validateStartLocation(input)
	await validateEndLocation(input)
	await validateTripConflict(input)
	await validateOdometer(input)
}
