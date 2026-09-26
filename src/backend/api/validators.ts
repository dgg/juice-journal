import { ProblemDetailsError } from "hono-problem-details"

import { Exists as VehicleExists } from "../db/queries/vehicles/Exists"
import { Exists as TripExists } from "../db/queries/trips/Exists"
import { GetLatestOdometer } from "../db/queries/trips/GetLatestOdometer"

import type { TripInput } from "../types"

import { problems } from "../problems"

export async function validateVehicle(req: TripInput): Promise<void> {
	try {
		const exists: boolean = await new VehicleExists(req.vehicle_id).execute()
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

export async function validateTripConflict(req: TripInput): Promise<void> {
	try {
		const exists = await new TripExists(req.vehicle_id, req.end_time).execute()
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
		const latest = await new GetLatestOdometer(req.vehicle_id).execute()
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
	await validateTripConflict(input)
	await validateOdometer(input)
}
