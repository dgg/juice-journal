import { z } from "zod"
import { DateTime } from "luxon"

const nanoid = z
	.string()
	.length(16)
	.regex(/^[A-Za-z0-9_-]{16}$/)

const DAYPARTS = ["morning", "afternoon"] as const
const daypart = z.enum(DAYPARTS)
export type Daypart = z.infer<typeof daypart>

const LOCATIONS = ["home", "work"] as const
const location = z.enum(LOCATIONS)
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
		odometer: z.number().optional()
	})
	.refine((input) => input.start_location !== input.end_location, {
		error: "locations can't be the same",
		path: ["end_location"]
	})

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
	odometer: z.number().nullable(),
	tracking: z.object({
		created: datetime,
		updated: datetime
	})
})

export type TripInput = z.output<typeof tripInputSchema>
export type TripInputRaw = z.input<typeof tripInputSchema>

const timePat = /^\d{2}:\d{2}$/
const datePat = /^\d{4}-\d{2}-\d{2}$/

export const tripFormSchema = z
	.object({
		vehicle_id: nanoid,
		trip_date: z.string().regex(datePat, "must be a valid date (yyyy-MM-dd)"),
		start_time: z.string().regex(timePat, "must be a valid time (HH:mm)"),
		end_time: z.string().regex(timePat, "must be a valid time (HH:mm)"),
		daypart,
		distance: z.string().min(1, "distance is required"),
		speed: z.string().optional(),
		consumption: z.string().optional(),
		odometer: z.string().optional(),
		start_location: location,
		end_location: location,
	})
	.superRefine((data, ctx) => {
		const dist = parseFloat(data.distance)
		if (isNaN(dist) || dist <= 0) {
			ctx.addIssue({ code: "custom", path: ["distance"], message: "distance must be greater than 0" })
		}
		const startStr = `${data.trip_date}T${data.start_time}`
		const endStr = `${data.trip_date}T${data.end_time}`
		if (endStr <= startStr) {
			ctx.addIssue({ code: "custom", path: ["end_time"], message: "end time must be after start time" })
		}
	})
	.transform((val): TripInput => {
		const tz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
		const startDt = DateTime.fromISO(`${val.trip_date}T${val.start_time}`, { zone: tz }).toUTC()
		const endDt = DateTime.fromISO(`${val.trip_date}T${val.end_time}`, { zone: tz }).toUTC()
		const duration = Math.round(endDt.diff(startDt, "minutes").minutes)
		return {
			vehicle_id: val.vehicle_id,
			start_time: startDt,
			end_time: endDt,
			daypart: val.daypart,
			duration,
			distance: parseFloat(val.distance),
			start_location: val.start_location,
			end_location: val.end_location,
			speed: val.speed ? parseFloat(val.speed) : undefined,
			consumption: val.consumption ? parseFloat(val.consumption) : undefined,
			odometer: val.odometer ? parseFloat(val.odometer) : undefined
		}
	})

export type TripCreation = z.output<typeof tripCreationSchema>
export type TripCreationRaw = z.input<typeof tripCreationSchema>