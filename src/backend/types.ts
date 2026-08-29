import { z } from "zod"
import { DateTime } from "luxon"

const nanoid = z
	.string()
	.length(16)
	.regex(/^[A-Za-z0-9_-]{16}$/)

const DAYPARTS = ["morning", "afternoon"] as const
const daypart = z.enum(DAYPARTS)
export type Daypart = z.infer<typeof daypart>

const datetime = z.iso
		.datetime({ offset: true })
		.transform((s) => DateTime.fromISO(s, { setZone: true }).toUTC())

export const tripInputSchema = z.object({
	vehicle_id: nanoid,
	start_time: datetime,
	end_time: datetime,
	daypart,
	/** trip duration (qudt:MIN) */
	duration: z.number().int().positive(),
	/** trip distance (qudt:KiloM) */
	distance: z.number().positive(),
	start_location_id: nanoid.optional(),
	end_location_id: nanoid.optional(),
	/* trip average speed (qudt:KiloM-PER-HR) */
	speed: z.number().positive().optional(),
	/** trip average consumotion (qudt_:KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: z.number().positive().optional(),
	/** odometer reading (qudt:KiloM) */
	odometer: z.number().optional()
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
	/** trip duration (MIN) */
	duration: z.number().int().positive(),
	/** trip distance (KiloM) */
	distance: z.number().positive(),
	/* trip average speed (KiloM-PER-HR) */
	speed: z.number().positive().nullable(),
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: z.number().positive().nullable(),
	/** odometer reading (KiloM) */
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
