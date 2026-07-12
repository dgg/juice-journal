import { z } from "zod"

export const tripInputSchema = z.object({
	vehicle_id: z.uuid(),
	start_time: z.iso.datetime(),
	end_time: z.iso.datetime(),
	daypart: z.enum(["morning", "afternoon"]),
	duration_min: z.number().int().positive(),
	distance_km: z.number().positive(),
	start_location_id: z.uuid().optional(),
	end_location_id: z.uuid().optional(),
	avg_speed_kmh: z.number().positive().optional(),
	avg_consumption_kwh_100km: z.number().positive().optional(),
	odometer_km: z.number().optional()
})

export type TripInput = z.infer<typeof tripInputSchema>

export interface Trip extends TripInput {
	id: string
	weather_start?: object
	weather_end?: object
	tracking_created: string
	tracking_updated: string
}
