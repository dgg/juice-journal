import { DateTime } from "luxon"
import type { ZodError } from "zod"

import type { TripFormIssues, TripFormRaw } from "./types"
import type { Daypart, Location } from "../../types"

import { displayTz } from "../../utils/dates"

import { FindAll, type VehicleRow } from "../../db/queries/vehicles/FindAll"

import { GetFromLatestTrip } from "../../db/queries/vehicles/GetFromLatestTrip"

export interface PropsArgs {
	error?: ZodError
	form?: TripFormRaw
}

// TODO: return interface?

const toFieldIssues = (err?: ZodError): TripFormIssues | undefined =>
	err?.issues.reduce(
		(map, issue) => {
			const key = issue.path[0] as keyof TripFormRaw
			map[key] = issue.message
			return map
		},
		{} as Record<keyof TripFormRaw, string>
	)

export const buildTripFormProps = async (opts?: PropsArgs) => {
	const tz = displayTz()
	const now = DateTime.now().setZone(tz)
	const nowDate = now.toFormat("yyyy-MM-dd")
	const nowTime = now.toFormat("HH:mm")
	const defaultDaypart: Daypart = now.hour < 13 ? "morning" : "afternoon"
	const [startLocation, endLocation]: [Location, Location] =
		defaultDaypart === "morning" ? ["home", "work"] : ["work", "home"]

	const vehicles: VehicleRow[] = await new FindAll().execute()
	const defaultVehicle = await new GetFromLatestTrip().execute()

	return {
		nowDate,
		nowTime,
		defaultDaypart,
		startLocation,
		endLocation,
		vehicles: vehicles.map((v) => ({ id: v.id, description: v.description })),
		defaultVehicleId: defaultVehicle?.id ?? null,
		issues: toFieldIssues(opts?.error),
		form: opts?.form
	}
}
