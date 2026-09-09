import { DateTime } from "luxon"
import type { ZodError } from "zod"

import type { TripFormRaw } from "./types"
import type { Daypart, Location } from "../types"

import { toFieldIssues } from "./formValidators"

import { displayTz } from "../utils/dates"

import { vehiclesQueries } from "../db/queries/vehicles"
import { tripsQueries } from "../db/queries/trips"

export interface PropsArgs {
	error?: ZodError
	form?: TripFormRaw
}

// TODO: return interface?

export const buildTripFormProps = async (opts?: PropsArgs) => {
	const tz = displayTz()
	const now = DateTime.now().setZone(tz)
	const nowDate = now.toFormat("yyyy-MM-dd")
	const nowTime = now.toFormat("HH:mm")
	const defaultDaypart: Daypart = now.hour < 13 ? "morning" : "afternoon"
	const [startLocation, endLocation]: [Location, Location] =
		defaultDaypart === "morning" ? ["home", "work"] : ["work", "home"]
	const vehicles = await vehiclesQueries.listAllVehicles()
	const defaultVehicleId = await tripsQueries.findLatestTripVehicleId()

	return {
		nowDate,
		nowTime,
		defaultDaypart,
		startLocation,
		endLocation,
		vehicles: vehicles.map((v) => ({ id: v.id, description: v.description })),
		defaultVehicleId,
		issues: toFieldIssues(opts?.error),
		form: opts?.form
	}
}
