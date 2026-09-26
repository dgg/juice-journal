import { sql } from "bun"
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { VehicleRow } from "../vehicles/VehicleRow"

import { GetLatestOdometer } from "./GetLatestOdometer"

const VEHICLE_ID = "vhcl_GetLatestOdometer"

const seedTrip = async (
	startIso: string,
	endIso: string,
	odometer: number | null = null
): Promise<void> =>
	await DbInstance.client`
		INSERT INTO trips (
			vehicle_id, start_time, end_time,
			start_location, end_location, daypart,
			duration, distance, odometer
		)
		VALUES (
			${VEHICLE_ID}, ${startIso}, ${endIso},
			'home', 'work', 'morning',
			10, 5.0, ${odometer}
		)
	`

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

describe(GetLatestOdometer.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "GetLatestOdometer"
		})

		await Promise.all([
			seedTrip("2026-09-01T08:00:00Z", "2026-09-01T08:30:00Z", 1000),
			seedTrip("2026-09-02T08:00:00Z", "2026-09-02T08:35:00Z", 1050),
			seedTrip("2026-09-03T08:00:00Z", "2026-09-03T08:36:00Z")
		])
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	describe("latest is null", () => {
		it("second latest", async () => {
			const odometer = await new GetLatestOdometer(VEHICLE_ID).execute(DbInstance.client)

			expect(odometer).toEqual(1050)
		})
	})
})
