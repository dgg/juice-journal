import { z } from "zod"

import { daypart, location, nanoid } from "../types"
import { DateTime } from "luxon"
import type { Env } from "hono"
import { displayTz } from "../utils/dates"

const optionalNumberoid = z.preprocess(
	(s: string | undefined) => (s ? s : undefined),
	// shorter message for phone layout
	z.coerce.number<string>("must be positive").positive().optional()
)

const timeAsMinutes = z.iso.time({ precision: -1 })

export const tripFormSchema = z
	.object({
		vehicle_id: nanoid,
		trip_date: z.iso.date(),
		start_time: timeAsMinutes,
		end_time: timeAsMinutes,
		daypart,
		// shorter message for phone layout
		distance: z.coerce.number<string>("must be positive").positive(),
		speed: optionalNumberoid,
		consumption: optionalNumberoid,
		odometer: optionalNumberoid,
		start_location: location,
		end_location: location
	})
	.refine((input) => input.start_time < input.end_time, {
		error: "trips must start before ending",
		path: ["end_time"]
	})
	.refine((input) => input.start_location !== input.end_location, {
		error: "locations can't be the same",
		path: ["end_location"]
	})
	.transform((form) => {
		const { trip_date, start_time, end_time, ...asIs } = form
		const tz = displayTz()
		const startDt = DateTime.fromISO(`${trip_date}T${start_time}`, {
			zone: tz
		}).toUTC()
		const endDt = DateTime.fromISO(`${trip_date}T${end_time}`, { zone: tz }).toUTC()
		const duration = Math.round(endDt.diff(startDt, "minutes").minutes)
		return {
			...asIs,
			start_time: startDt,
			end_time: endDt,
			duration
		}
	})

export type TripForm = z.output<typeof tripFormSchema>
export type TripFormRaw = z.input<typeof tripFormSchema>
export type TripFormIssues = Partial<Record<keyof TripFormRaw, string>>

export type TripsEnv = Env & {
	Variables: {
		raw: TripFormRaw
		form: TripForm
	}
}
