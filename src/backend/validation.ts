import { db } from "../db/client"
import type { TripInput, ValidationError } from "./types"

export async function validateTripInput(input: unknown): Promise<{
	valid: boolean
	errors: ValidationError[]
	data?: TripInput
}> {
	const errors: ValidationError[] = []

	// Check if input is an object
	if (!input || typeof input !== "object") {
		return {
			valid: false,
			errors: [{ field: "body", message: "Request body must be a JSON object" }]
		}
	}

	const data = input as Record<string, unknown>

	// Required fields validation
	const requiredFields: (keyof TripInput)[] = [
		"vehicle_id",
		"start_time",
		"end_time",
		"daypart",
		"duration_min",
		"distance_km"
	]

	for (const field of requiredFields) {
		if (!(field in data) || data[field] === null || data[field] === undefined) {
			errors.push({ field: String(field), message: `${field} is required` })
		}
	}

	if (errors.length > 0) {
		return { valid: false, errors }
	}

	// Type validation
	if (typeof data.vehicle_id !== "string") {
		errors.push({ field: "vehicle_id", message: "vehicle_id must be a string" })
	}

	if (typeof data.start_time !== "string") {
		errors.push({ field: "start_time", message: "start_time must be a string" })
	}

	if (typeof data.end_time !== "string") {
		errors.push({ field: "end_time", message: "end_time must be a string" })
	}

	if (typeof data.duration_min !== "number" || !Number.isInteger(data.duration_min)) {
		errors.push({ field: "duration_min", message: "duration_min must be an integer" })
	}

	if (typeof data.distance_km !== "number") {
		errors.push({ field: "distance_km", message: "distance_km must be a number" })
	}

	// Daypart validation
	if (
		typeof data.daypart !== "string" ||
		!["morning", "afternoon"].includes(data.daypart)
	) {
		errors.push({
			field: "daypart",
			message: "daypart must be 'morning' or 'afternoon'"
		})
	}

	// Distance validation
	if (typeof data.distance_km === "number" && data.distance_km <= 0) {
		errors.push({
			field: "distance_km",
			message: "distance_km must be greater than 0"
		})
	}

	if (errors.length > 0) {
		return { valid: false, errors }
	}

	// Validate ISO 8601 timestamps
	try {
		new Date(data.start_time as string).toISOString()
	} catch {
		errors.push({
			field: "start_time",
			message: "start_time must be a valid ISO 8601 timestamp"
		})
	}

	try {
		new Date(data.end_time as string).toISOString()
	} catch {
		errors.push({
			field: "end_time",
			message: "end_time must be a valid ISO 8601 timestamp"
		})
	}

	if (errors.length > 0) {
		return { valid: false, errors }
	}

	// Validate vehicle exists
	try {
		const vehicle = await db`
      SELECT id FROM vehicles WHERE id = ${data.vehicle_id as string}
    `

		if (vehicle.length === 0) {
			errors.push({
				field: "vehicle_id",
				message: "vehicle does not exist"
			})
		}
	} catch (err) {
		errors.push({
			field: "vehicle_id",
			message: "failed to validate vehicle"
		})
	}

	// Validate location FKs if provided
	if (data.start_location_id) {
		if (typeof data.start_location_id !== "string") {
			errors.push({
				field: "start_location_id",
				message: "start_location_id must be a string"
			})
		} else {
			try {
				const location = await db`
          SELECT id FROM locations WHERE id = ${data.start_location_id}
        `

				if (location.length === 0) {
					errors.push({
						field: "start_location_id",
						message: "start_location does not exist"
					})
				}
			} catch {
				errors.push({
					field: "start_location_id",
					message: "failed to validate start_location"
				})
			}
		}
	}

	if (data.end_location_id) {
		if (typeof data.end_location_id !== "string") {
			errors.push({
				field: "end_location_id",
				message: "end_location_id must be a string"
			})
		} else {
			try {
				const location = await db`
          SELECT id FROM locations WHERE id = ${data.end_location_id}
        `

				if (location.length === 0) {
					errors.push({
						field: "end_location_id",
						message: "end_location does not exist"
					})
				}
			} catch {
				errors.push({
					field: "end_location_id",
					message: "failed to validate end_location"
				})
			}
		}
	}

	if (errors.length > 0) {
		return { valid: false, errors }
	}

	return {
		valid: true,
		errors: [],
		data: {
			vehicle_id: data.vehicle_id as string,
			start_time: data.start_time as string,
			end_time: data.end_time as string,
			daypart: data.daypart as "morning" | "afternoon",
			duration_min: data.duration_min as number,
			distance_km: data.distance_km as number,
			start_location_id: data.start_location_id as string | undefined,
			end_location_id: data.end_location_id as string | undefined,
			avg_speed_kmh: data.avg_speed_kmh as number | undefined,
			avg_consumption_kwh_100km: data.avg_consumption_kwh_100km as
				number | undefined,
			weather_start: data.weather_start as Record<string, unknown> | undefined,
			weather_end: data.weather_end as Record<string, unknown> | undefined,
			odometer_km: data.odometer_km as number | undefined
		}
	}
}
