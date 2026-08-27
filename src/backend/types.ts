import { z } from "zod"
import { DateTime } from "luxon"

const nanoid = z
	.string()
	.length(16)
	.regex(/^[A-Za-z0-9_-]{16}$/)

const daypart = z.enum(["morning", "afternoon"])

const datetime = z.iso
		.datetime({ offset: true })
		.transform((s) => DateTime.fromISO(s, { setZone: true }).toUTC())

export const tripInputSchema = z.object({
	vehicle_id: nanoid,
	start_time: datetime,
	end_time: datetime,
	daypart,
	duration_min: z.number().int().positive(),
	distance_km: z.number().positive(),
	start_location_id: nanoid.optional(),
	end_location_id: nanoid.optional(),
	avg_speed_kmh: z.number().positive().optional(),
	avg_consumption_kwh_100km: z.number().positive().optional(),
	odometer_km: z.number().optional()
})

const waypoint = z.object({
	location: nanoid.nullable(),
	time: datetime,
	weather: z.unknown().nullable()
})

export const tripCreationSchema = z.object({
	id: nanoid,
	daypart,
	vehicle: nanoid,
	start: waypoint,
	end: waypoint,
	duration: z.number().int().positive(),
	distance: z.number().positive(),
	speed: z.number().positive().nullable(),
	consumption: z.number().positive().nullable(),
	odometer: z.number().nullable(),
	tracking: z.object({
		created: datetime,
		updated: datetime
	})
})

export type TripInput = z.output<typeof tripInputSchema>
export type TripInputRaw = z.input<typeof tripInputSchema>

export type TripCreation = z.output<typeof tripCreationSchema>
export type TripCreationRaw = z.input<typeof tripCreationSchema>
