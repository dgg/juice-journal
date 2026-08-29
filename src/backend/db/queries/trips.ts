import { DateTime } from "luxon"

import { locationsQueries } from "./locations"

import { db } from "../client"
import { toNumber, toUtcDateTime, fromUtcDateTime } from "../convert"
import type { TripInput, Daypart } from "../../types"
import type { WeatherSnapshot } from "../../weather/types"
import { storeWeather, type WeatherParam } from "../../weather/storage"

export interface TripRow {
	id: string
	vehicle_id: string
	start_time: DateTime
	end_time: DateTime
	start_location_id: string | null
	end_location_id: string | null
	daypart: Daypart
	/** trip duration (MIN) */
	duration: number
	/** trip distance (KiloM) */
	distance: number
	/* trip average speed (KiloM-PER-HR) */
	speed: number | null
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: number | null
	weather_start: WeatherSnapshot | null
	weather_end: WeatherSnapshot | null
	/** odometer reading (KiloM) */
	odometer: number | null
	tracking_created: DateTime
	tracking_updated: DateTime
}

export interface TripWithLocationRow {
	id: string
	start_time: DateTime
	end_time: DateTime
	daypart: Daypart
	duration: number
	distance: number
	speed: number | null
	consumption: number | null
	odometer: number | null
	start_location: string | null
	end_location: string | null
	weatherStart: WeatherSnapshot | null
}

function mapTripRow(raw: Record<string, unknown>): TripRow {
	return {
		id: raw.id as string,
		vehicle_id: raw.vehicle_id as string,
		start_time: toUtcDateTime(raw.start_time as Date),
		end_time: toUtcDateTime(raw.end_time as Date),
		start_location_id: (raw.start_location_id as string | null) ?? null,
		end_location_id: (raw.end_location_id as string | null) ?? null,
		daypart: raw.daypart as Daypart,
		duration: raw.duration as number,
		distance: toNumber(raw.distance as string | null) ?? 0,
		speed: toNumber(raw.speed as string | null),
		consumption: toNumber(raw.consumption as string | null),
		weather_start: (raw.weather_start as WeatherSnapshot | null) ?? null,
		weather_end: (raw.weather_end as WeatherSnapshot | null) ?? null,
		odometer: toNumber(raw.odometer as string | null),
		tracking_created: toUtcDateTime(raw.tracking_created as Date),
		tracking_updated: toUtcDateTime(raw.tracking_updated as Date)
	}
}

function mapTripWithLocationRow(raw: Record<string, unknown>): TripWithLocationRow {
	return {
		id: raw.id as string,
		start_time: toUtcDateTime(raw.start_time as Date),
		end_time: toUtcDateTime(raw.end_time as Date),
		daypart: raw.daypart as Daypart,
		duration: raw.duration as number,
		distance: toNumber(raw.distance as string | null) ?? 0,
		speed: toNumber(raw.speed as string | null),
		consumption: toNumber(raw.consumption as string | null),
		odometer: toNumber(raw.odometer as string | null),
		start_location: (raw.start_location as string | null) ?? null,
		end_location: (raw.end_location as string | null) ?? null,
		weatherStart: (raw.weather_start as WeatherSnapshot | null) ?? null
	}
}

export const tripsQueries = {
	async createTrip(input: TripInput): Promise<TripRow> {
		const rows = await db`
			INSERT INTO trips (
				vehicle_id,
				start_time,
				end_time,
				start_location_id,
				end_location_id,
				daypart,
				duration,
				distance,
				speed,
				consumption,
				weather_start,
				weather_end,
				odometer
			)
			VALUES (
				${input.vehicle_id},
				${fromUtcDateTime(input.start_time)},
				${fromUtcDateTime(input.end_time)},
				${input.start_location_id ?? null},
				${input.end_location_id ?? null},
				${input.daypart},
				${input.duration},
				${input.distance},
				${input.speed ?? null},
				${input.consumption ?? null},
				null,
				null,
				${input.odometer ?? null}
			)
			RETURNING *
		`
		const trip = mapTripRow(rows[0] as unknown as Record<string, unknown>)

		const startLoc = input.start_location_id
			? await locationsQueries.findLocationById(input.start_location_id)
			: null
		const endLoc = input.end_location_id
			? await locationsQueries.findLocationById(input.end_location_id)
			: null

		if (startLoc || endLoc) {
			const start: WeatherParam = {
				location: {
					latitude: startLoc!.latitude,
					longitude: startLoc!.longitude
				},
				time: input.start_time
			}
			const end: WeatherParam = {
				location: {
					latitude: endLoc!.latitude,
					longitude: endLoc!.longitude
				},
				time: input.end_time
			}
			await storeWeather(trip.id, start, end)

			const updated = await db`SELECT * FROM trips WHERE id = ${trip.id}`
			if (updated.length > 0) {
				return mapTripRow(updated[0] as unknown as Record<string, unknown>)
			}
		}

		return trip
	},

	async updateWeather(
		id: string,
		weatherStart: WeatherSnapshot | null,
		weatherEnd: WeatherSnapshot | null
	): Promise<void> {
		await db`
			UPDATE trips SET
				weather_start = ${weatherStart},
				weather_end = ${weatherEnd},
				tracking_updated = now()
			WHERE id = ${id}
		`
	},

	async findTripsByMonth(params: {
		startUtc: DateTime
		endUtc: DateTime
	}): Promise<TripRow[]> {
		const rows = await db`
			SELECT * FROM trips
			WHERE end_time >= ${params.startUtc.toISO()}
				AND end_time < ${params.endUtc.toISO()}
			ORDER BY end_time DESC
		`
		return rows.map((r: unknown) => mapTripRow(r as Record<string, unknown>))
	},

	async findTripsByMonthForVehicle(params: {
		startUtc: DateTime
		endUtc: DateTime
		vehicleId: string
	}): Promise<TripRow[]> {
		const rows = await db`
			SELECT * FROM trips
			WHERE end_time >= ${params.startUtc.toISO()}
				AND end_time < ${params.endUtc.toISO()}
				AND vehicle_id = ${params.vehicleId}
			ORDER BY end_time DESC
		`
		return rows.map((r: unknown) => mapTripRow(r as Record<string, unknown>))
	},

	async existsTripByVehicleAndEndTime(params: {
		vehicleId: string
		endTime: DateTime
	}): Promise<boolean> {
		const rows = await db`
			SELECT 1 FROM trips
			WHERE vehicle_id = ${params.vehicleId}
				AND end_time = ${fromUtcDateTime(params.endTime)}
		`
		return rows.length > 0
	},

	async findLatestTripVehicleId(): Promise<string | null> {
		const rows = await db`
			SELECT vehicle_id FROM trips
			ORDER BY end_time DESC
			LIMIT 1
		`
		if (rows.length === 0) return null
		return (rows[0] as unknown as Record<string, unknown>).vehicle_id as string
	},

	async findEarliestTripYear(): Promise<number | null> {
		const rows = await db`
			SELECT EXTRACT(YEAR FROM MIN(end_time))::int as year FROM trips
		`
		if (rows.length === 0) return null
		return (rows[0] as unknown as Record<string, unknown>).year as number | null
	},

	async findLatestOdometerForVehicle(vehicleId: string): Promise<number | null> {
		const rows = await db`
			SELECT odometer FROM trips
			WHERE vehicle_id = ${vehicleId}
				AND odometer IS NOT NULL
			ORDER BY end_time DESC
			LIMIT 1
		`
		if (rows.length === 0) return null
		return toNumber(
			(rows[0] as unknown as Record<string, unknown>).odometer as string | null
		)
	},

	async findTripsWithLocations(params: {
		startUtc: DateTime
		endUtc: DateTime
		vehicleId?: string
	}): Promise<TripWithLocationRow[]> {
		const rows = params.vehicleId
			? await db`
				SELECT
					t.id,
					t.start_time,
					t.end_time,
					t.daypart,
					t.duration,
					t.distance,
					t.speed,
					t.consumption,
					t.odometer,
					t.weather_start,
					start_loc.label as start_location,
					end_loc.label as end_location
				FROM trips t
				LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
				LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
				WHERE t.end_time >= ${params.startUtc.toISO()}
					AND t.end_time < ${params.endUtc.toISO()}
					AND t.vehicle_id = ${params.vehicleId}
				ORDER BY t.end_time DESC
			`
			: await db`
				SELECT
					t.id,
					t.start_time,
					t.end_time,
					t.daypart,
					t.duration,
					t.distance,
					t.speed,
					t.consumption,
					t.odometer,
					t.weather_start,
					start_loc.label as start_location,
					end_loc.label as end_location
				FROM trips t
				LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
				LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
				WHERE t.end_time >= ${params.startUtc.toISO()}
					AND t.end_time < ${params.endUtc.toISO()}
				ORDER BY t.end_time DESC
			`
		return rows.map((r: unknown) =>
			mapTripWithLocationRow(r as Record<string, unknown>)
		)
	}
}
