import { z } from "zod"
import { DateTime } from "luxon"

export const nanoid = z.nanoid({length: 16})

const DAYPARTS = ["morning", "afternoon"] as const
export const daypart = z.enum(DAYPARTS)
export type Daypart = z.infer<typeof daypart>

const LOCATIONS = ["home", "work"] as const
export const location = z.enum(LOCATIONS)
export type Location = z.infer<typeof location>

const datetime = z.iso
	.datetime({ offset: true })
	.transform((s) => DateTime.fromISO(s, { setZone: true }).toUTC())

export const tripInputSchema = z
	.object({
		vehicle_id: nanoid,
		start_time: datetime,
		end_time: datetime,
		daypart,
		/** trip duration (qudt:MIN) */
		duration: z.number().int().positive(),
		/** trip distance (qudt:KiloM) */
		distance: z.number().positive(),
		start_location: location,
		end_location: location,
		/* trip average speed (qudt:KiloM-PER-HR) */
		speed: z.number().positive().optional(),
		/** trip average consumotion (qudt_:KiloW-HR-PER-HUNDRED-KiloM) */
		consumption: z.number().positive().optional(),
		/** odometer reading (qudt:KiloM) */
		odometer: z.number().positive().optional()
	})
	.refine((input) => input.start_time < input.end_time, {
		error: "trips must start before ending",
		path: ["end_time"]
	})
	.refine((input) => input.start_location !== input.end_location, {
		error: "locations can't be the same",
		path: ["end_location"]
	})

export type TripInput = z.output<typeof tripInputSchema>
export type TripInputRaw = z.input<typeof tripInputSchema>

const waypoint = z.object({
	location: location.nullable(),
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
	odometer: z.number().positive().nullable(),
	tracking: z.object({
		created: datetime,
		updated: datetime
	})
})




export type TripCreation = z.output<typeof tripCreationSchema>
export type TripCreationRaw = z.input<typeof tripCreationSchema>
