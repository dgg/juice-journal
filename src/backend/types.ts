export interface TripInput {
	vehicle_id: string
	start_time: string // ISO 8601 timestamp
	end_time: string // ISO 8601 timestamp
	daypart: "morning" | "afternoon"
	duration_min: number
	distance_km: number
	start_location_id?: string
	end_location_id?: string
	avg_speed_kmh?: number
	avg_consumption_kwh_100km?: number
	weather_start?: Record<string, unknown>
	weather_end?: Record<string, unknown>
	odometer_km?: number
}

export interface Trip extends TripInput {
	id: string
	tracking_created: string
	tracking_updated: string
}

export interface ValidationError {
	field: string
	message: string
}
