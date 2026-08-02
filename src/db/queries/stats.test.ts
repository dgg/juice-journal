import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../client"
import { statsQueries } from "./stats"
import { tripsQueries } from "./trips"

const TEST_VEHICLE_ID = "V1StGXR8_Z5jdHi6"

beforeAll(async () => {
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`
		await db`DELETE FROM vehicles WHERE id = ${TEST_VEHICLE_ID}`
	} catch {}
})

describe("statsQueries", () => {
	describe("monthlyAggregates", () => {
		it("returns null aggregates when no trips", async () => {
			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-01-01T00:00:00Z",
				endUtc: "2026-02-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})
			expect(result.avgConsumption).toBeNull()
			expect(result.avgDuration).toBeNull()
			expect(result.totalDistance).toBeNull()
		})

		it("computes aggregates for trips in window", async () => {
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-10T08:00:00Z",
				end_time: "2026-07-10T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.0,
				avg_consumption_kwh_100km: 20.0
			})
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-11T08:00:00Z",
				end_time: "2026-07-11T08:30:00Z",
				daypart: "morning",
				duration_min: 30,
				distance_km: 10.0,
				avg_consumption_kwh_100km: 18.0
			})

			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-07-01T00:00:00Z",
				endUtc: "2026-08-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})

			expect(result.avgConsumption).toBe(19.0)
			expect(result.avgDuration).toBe(37.5)
			expect(result.totalDistance).toBe(25.0)
		})

		it("works without vehicle filter", async () => {
			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-07-01T00:00:00Z",
				endUtc: "2026-08-01T00:00:00Z"
			})
			expect(result.avgConsumption).not.toBeNull()
			expect(result.avgDuration).not.toBeNull()
			expect(result.totalDistance).not.toBeNull()
		})
	})
})
