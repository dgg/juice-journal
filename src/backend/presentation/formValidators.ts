import type { $ZodIssue as ZodIssue } from "zod/v4/core"
import { ZodError } from "zod"

import { vehiclesQueries } from "../db/queries/vehicles"
import { tripsQueries } from "../db/queries/trips"
import type { TripInput } from "../types"

async function checkVehicleExists(input: TripInput): Promise<ZodIssue[]> {
	const issues: ZodIssue[] = []
	const exists = await vehiclesQueries.vehicleExists(input.vehicle_id)
	if (!exists) {
		issues.push({
			code: "custom",
			path: ["vehicle_id"],
			message: `Vehicle '${input.vehicle_id}' does not exist`
		})
	}
	return issues
}

async function checkTripConflict(input: TripInput): Promise<ZodIssue[]> {
	const issues: ZodIssue[] = []
	const exists = await tripsQueries.existsTripByVehicleAndEndTime({
		vehicleId: input.vehicle_id,
		endTime: input.end_time
	})
	if (exists) {
		issues.push({
			code: "custom",
			path: ["end_time"],
			message: "A trip with this vehicle_id and end_time already exists"
		})
	}
	return issues
}

async function checkOdometerMonotonicity(input: TripInput): Promise<ZodIssue[]> {
	const issues: ZodIssue[] = []
	if (input.odometer !== undefined) {
		const latest = await tripsQueries.findLatestOdometerForVehicle(input.vehicle_id)
		if (latest !== null && input.odometer < latest) {
			issues.push({
				code: "custom",
				path: ["odometer"],
				message: `Odometer reading ${input.odometer} is lower than the previous reading ${latest}`
			})
		}
	}

	return issues
}

export async function validateTripFormConsistency(input: TripInput): Promise<ZodError> {
	const issues = await Promise.all([
		checkVehicleExists(input),
		checkTripConflict(input),
		checkOdometerMonotonicity(input)
	])
	const aggregatedError = new ZodError(issues.flat())
	return aggregatedError
}

export function zodIssuesToFieldMap(issues: ZodIssue[]): Record<string, string> {
	const map: Record<string, string> = {}
	for (const issue of issues) {
		const key = issue.path.join(".")
		if (!(key in map)) {
			map[key] = issue.message
		}
	}
	return map
}
