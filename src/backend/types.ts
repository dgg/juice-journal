import { z } from "zod"
import { DateTime } from "luxon"

export const tripInputSchema = z.object({
	vehicle_id: z
		.string()
		.length(16)
		.regex(/^[A-Za-z0-9_-]{16}$/),
	start_time: z.iso.datetime({ offset: true }).transform((s) =>
		DateTime.fromISO(s, { setZone: true }).toUTC()
	),
	end_time: z.iso.datetime({ offset: true }).transform((s) =>
		DateTime.fromISO(s, { setZone: true }).toUTC()
	),
	daypart: z.enum(["morning", "afternoon"]),
	duration_min: z.number().int().positive(),
	distance_km: z.number().positive(),
	start_location_id: z
		.string()
		.length(16)
		.regex(/^[A-Za-z0-9_-]{16}$/)
		.optional(),
	end_location_id: z
		.string()
		.length(16)
		.regex(/^[A-Za-z0-9_-]{16}$/)
		.optional(),
	avg_speed_kmh: z.number().positive().optional(),
	avg_consumption_kwh_100km: z.number().positive().optional(),
	odometer_km: z.number().optional()
})

export type TripInput = z.output<typeof tripInputSchema>
export type TripInputRaw = z.input<typeof tripInputSchema>
