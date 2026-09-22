import { describe, it, expect, beforeAll, afterAll } from "bun:test"

import { DbInstance } from "../../../../fixture-setup"
import { GetFromLatestTrip } from "./GetFromLatestTrip"

const VEHICLE_LATEST = "testveh_latest_trip_A"
const VEHICLE_OLDER = "testveh_latest_trip_B"

async function seedVehicle(id: string, description: string) {
	const db = DbInstance.client
	await db`INSERT INTO vehicles (id, description) VALUES (${id}, ${description})`
}

async function seedTrip(vehicleId: string, startIso: string, endIso: string) {
	const db = DbInstance.client
	await db`
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
	`
}

describe(GetFromLatestTrip.name, () => {
	beforeAll(async () => {
		await seedVehicle(VEHICLE_LATEST, "Latest")
		await seedVehicle(VEHICLE_OLDER, "Older")
	})

	describe("No trips", () => {
		it("null", async () => {
			const nil = await new GetFromLatestTrip().execute(DbInstance.client)
			expect(nil).toBeNull()
		})
	})

	describe("Some trips", () => {
		beforeAll(async () => {
			await seedTrip(VEHICLE_LATEST, "2026-09-01T08:00:00Z", "2026-09-01T08:15:00Z")
			await seedTrip(VEHICLE_LATEST, "2026-09-01T15:00:00Z", "2026-09-01T15:15:00Z")
		})
		describe("only trips from one vehicle", () => {
			it("vehicle from latest trip", async () => {
				const latest = await new GetFromLatestTrip().execute(DbInstance.client)
				expect(latest).toEqual({
					id: VEHICLE_LATEST,
					description: "Latest"
				})
			})
		})

		describe("trips from several vechicles", () => {
			beforeAll(async () => {
				await seedTrip(
					VEHICLE_OLDER,
					"2026-08-01T08:00:00Z",
					"2026-08-01T08:15:00Z"
				)
				await seedTrip(
					VEHICLE_OLDER,
					"2026-09-01T15:00:00Z",
					"2026-09-01T15:15:00Z"
				)
			})
			it("vehicle from latest trip", async () => {
				const latest = await new GetFromLatestTrip().execute(DbInstance.client)
				expect(latest).toEqual({
					id: VEHICLE_LATEST,
					description: "Latest"
				})
			})
		})
	})

	afterAll(async () => {
		const db = DbInstance.client
		await db`DELETE FROM trips WHERE vehicle_id IN (${VEHICLE_LATEST}, ${VEHICLE_OLDER})`
		await db`DELETE FROM vehicles WHERE id IN (${VEHICLE_LATEST}, ${VEHICLE_OLDER})`
	})
})
