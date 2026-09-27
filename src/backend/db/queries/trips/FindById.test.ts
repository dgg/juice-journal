import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { VehicleRow } from "../vehicles/VehicleRow"

import { FindById } from "./FindById"

const VEHICLE_ID = "vhcl_FindById"
let tripId: string

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

import { sql } from "bun"

describe(FindById.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "FindById"
		})
		const [{ id }] = await DbInstance.client`
			INSERT INTO trips (
				vehicle_id, start_time, end_time,
				start_location, end_location, daypart,
				duration, distance, speed, consumption, odometer
			)
			VALUES (
				${VEHICLE_ID},
				${"2026-06-01T08:00:00Z"},
				${"2026-06-01T08:45:00Z"},
				'home', 'work', 'morning',
				45, 15.0, 20, 14, 50000
			)
			RETURNING id
		`
		tripId = id
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	it("returns TripSnapshot for an existing trip", async () => {
		const result = await new FindById(tripId).execute(DbInstance.client)

		expect(result).not.toBeNull()
		expect(result!.id).toBe(tripId)
		expect(result!.daypart).toBe("morning")
		expect(result!.duration).toBe(45)
		expect(result!.distance).toBe(15.0)
		expect(result!.speed).toBe(20)
		expect(result!.consumption).toBe(14)
		expect(result!.odometer).toBe(50000)
		expect(result!.start_location).toBe("home")
		expect(result!.end_location).toBe("work")
		expect(result!.start_time).toEqual(
			DateTime.fromISO("2026-06-01T08:00:00Z", { setZone: true })
		)
		expect(result!.end_time).toEqual(
			DateTime.fromISO("2026-06-01T08:45:00Z", { setZone: true })
		)
	})

	it("returns null for a non-existent trip", async () => {
		const result = await new FindById("nonexistent").execute(DbInstance.client)
		expect(result).toBeNull()
	})
})