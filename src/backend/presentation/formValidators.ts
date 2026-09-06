import type { ZodIssue } from "zod"

import { vehiclesQueries } from "../db/queries/vehicles"
import { tripsQueries } from "../db/queries/trips"
import type { TripInput } from "../types"

async function checkVehicleExists(input: TripInput): Promise<ZodIssue[]> {
	const exists = await vehiclesQueries.vehicleExists(input.vehicle_id)
	if (!exists) {
		return [
			{
				code: "custom",
				path: ["vehicle_id"],
				message: `Vehicle '${input.vehicle_id}' does not exist`
			}
		]
	}
	return []
}

async function checkTripConflict(input: TripInput): Promise<ZodIssue[]> {
	const exists = await tripsQueries.existsTripByVehicleAndEndTime({
		vehicleId: input.vehicle_id,
		endTime: input.end_time
	})
	if (exists) {
		return [
			{
				code: "custom",
				path: ["end_time"],
				message: "A trip with this vehicle_id and end_time already exists"
			}
		]
	}
	return []
}

async function checkOdometerMonotonicity(input: TripInput): Promise<ZodIssue[]> {
	if (input.odometer === undefined) return []
	const latest = await tripsQueries.findLatestOdometerForVehicle(input.vehicle_id)
	if (latest !== null && input.odometer < latest) {
		return [
			{
				code: "custom",
				path: ["odometer"],
				message: `Odometer reading ${input.odometer} is lower than the previous reading ${latest}`
			}
		]
	}
	return []
}

export async function validateTripFormConsistency(input: TripInput): Promise<ZodIssue[]> {
	const results = await Promise.all([
		checkVehicleExists(input),
		checkTripConflict(input),
		checkOdometerMonotonicity(input)
	])
	return results.flat()
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