import { createMiddleware } from "hono/factory"
import { ZodError } from "zod"
import type { $ZodIssue as ZodIssue } from "zod/v4/core"

import type { TripForm, TripsEnv } from "./types"

import { buildTripFormProps } from "./formProps"

import { vehiclesQueries } from "../../db/queries/vehicles"
import { tripsQueries } from "../../db/queries/trips"

import { TripFormFragment } from "../../../frontend/fragments/TripFormFragment"

async function checkVehicleExists(input: TripForm): Promise<ZodIssue[]> {
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

async function checkTripConflict(input: TripForm): Promise<ZodIssue[]> {
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

async function checkOdometerMonotonicity(input: TripForm): Promise<ZodIssue[]> {
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


const validateTripConsistency = async (input: TripForm): Promise<ZodError> => {
	const issues = await Promise.all([
		checkVehicleExists(input),
		checkTripConflict(input),
		checkOdometerMonotonicity(input)
	])
	const aggregatedError = new ZodError(issues.flat())
	return aggregatedError
}

export const formConsistencyCheck = createMiddleware<TripsEnv>(async (c, next) => {
	const error = await validateTripConsistency(c.var.form)
	if (error.issues.length > 0) {
		return c.html(
			<TripFormFragment
				{...await buildTripFormProps({
					form: c.var.raw,
					error
				})}
			/>,
			200
		)
	}
	await next()
})
