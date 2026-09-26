import { sql } from "bun"
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { TripDetail } from "../trips/trips"
import type { VehicleRow } from "../vehicles/VehicleRow"

import type { WeatherSnapshot } from "../../../weather/types"

import { UpdateWeather } from "./UpdateWeather"

type Trip = Pick<TripDetail, "weather_start" | "weather_end">

async function insertTrip(
	vehicleId: string,
	startIso: string,
	endIso: string
): Promise<string> {
	const [{ id }] = await DbInstance.client`
		INSERT INTO trips (
			vehicle_id, start_time, end_time,
			start_location, end_location, daypart,
			duration, distance
		)
		VALUES (
			${vehicleId}, ${startIso}, ${endIso},
			'home', 'work', 'morning',
			10, 5.0
		)
		RETURNING id
	`
	return id
}

const getTrip = async (id: string): Promise<Trip> => {
	const rows: Trip[] = await DbInstance.client`
		SELECT weather_start, weather_end
		FROM trips
		WHERE id = ${id}
	`
	return rows[0]!
}

const VEHICLE_ID = "vhcl_UpdateWeather"

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

describe(UpdateWeather.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "PeriodTrips"
		})
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	describe("existing trip", () => {
		it("weeather updated", async () => {
			const observedAt = DateTime.fromISO("2026-08-01T08:00:00Z", { setZone: true })
			const start: WeatherSnapshot = {
				humidity: 87,
				observedAt,
				precipitation: 1.9,
				temperature: 19.6,
				weatherCode: 61,
				wind: {
					direction: 312,
					speed: 1.25
				}
			}
			const end: WeatherSnapshot = {
				humidity: 59,
				observedAt,
				precipitation: 0,
				temperature: 16.7,
				weatherCode: 3,
				wind: {
					direction: 267,
					speed: 3.9
				}
			}
			const id = await insertTrip(
				VEHICLE_ID,
				"2026-08-01T07:45:00Z",
				"2026-08-01T08:00:00Z"
			)

			await new UpdateWeather(id, start, end).execute(DbInstance.client)

			const updated = await getTrip(id)
			// there are problems comparing dates
			const { observedAt: _, ...expectedStart } = start
			const { observedAt: __, ...expectedEnd } = end

			expect(updated.weather_start).toMatchObject(expectedStart)
			expect(updated.weather_end).toMatchObject(expectedEnd)
		})
	})
})
