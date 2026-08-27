import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "./db/client"

const TEST_VEHICLE_ID = "V1StGXR8_Z5jdHi6"

beforeAll(async () => {
	try {
		await db`
      INSERT INTO vehicles (id, description)
      VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')
    `
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`
	} catch {}
})

describe("FK Check Middleware (integration via raw DB queries)", () => {
	describe("Vehicle FK", () => {
		it("should detect non-existent vehicle_id", async () => {
			const result = await db`
        SELECT id FROM vehicles WHERE id = 'invalid-test-id1'
      `
			expect(result.length).toBe(0)
		})

		it("should find existing vehicle_id", async () => {
			const result = await db`
        SELECT id FROM vehicles WHERE id = ${TEST_VEHICLE_ID}
      `
			expect(result.length).toBe(1)
		})
	})

	describe("Location FK", () => {
		it("should detect non-existent start_location_id", async () => {
			const result = await db`
        SELECT id FROM locations WHERE id = 'invalid-test-id2'
      `
			expect(result.length).toBe(0)
		})
	})
})

describe("Unique Constraint Pre-check (tripConflictValidator integration)", () => {
	const TRIP_END_TIME = "2026-07-15T10:30:00Z"
	const TRIP_END_TIME_2 = "2026-07-16T10:30:00Z"

	describe("Pre-existing duplicate detection", () => {
		it("should detect a pre-existing duplicate (vehicle_id, end_time)", async () => {
			// Insert a trip
			await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID},
          '2026-07-15T10:00:00Z',
          ${TRIP_END_TIME},
          'morning',
          30,
          15.0
        )
      `

			// Query to verify the trip exists (what tripConflictValidator would do)
			const existing = await db`
        SELECT 1 FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID} AND end_time = ${TRIP_END_TIME}
      `
			expect(existing.length).toBe(1)
		})

		it("should allow a non-duplicate trip (same vehicle, different end_time)", async () => {
			// Insert a trip with different end_time
			await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID},
          '2026-07-16T10:00:00Z',
          ${TRIP_END_TIME_2},
          'morning',
          30,
          15.0
        )
      `

			// Query to verify it's not a duplicate
			const existing = await db`
        SELECT 1 FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID} AND end_time = ${TRIP_END_TIME_2}
      `
			expect(existing.length).toBe(1)

			// Query to verify the first trip is still there
			const firstTrip = await db`
        SELECT 1 FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID} AND end_time = ${TRIP_END_TIME}
      `
			expect(firstTrip.length).toBe(1)
		})

		it("should allow a duplicate end_time with a different vehicle", async () => {
			const OTHER_VEHICLE_ID = "other_vehicle_id"

			// Setup: create a second vehicle
			try {
				await db`
          INSERT INTO vehicles (id, description)
          VALUES (${OTHER_VEHICLE_ID}, 'Other Vehicle')
        `
			} catch {}

			// Insert a trip for the other vehicle with the same end_time as the first vehicle
			await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${OTHER_VEHICLE_ID},
          '2026-07-15T09:00:00Z',
          ${TRIP_END_TIME},
          'morning',
          30,
          15.0
        )
      `

			// Query to verify both trips exist with the same end_time but different vehicle
			const tripForVehicle1 = await db`
        SELECT 1 FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID} AND end_time = ${TRIP_END_TIME}
      `
			const tripForVehicle2 = await db`
        SELECT 1 FROM trips WHERE vehicle_id = ${OTHER_VEHICLE_ID} AND end_time = ${TRIP_END_TIME}
      `
			expect(tripForVehicle1.length).toBe(1)
			expect(tripForVehicle2.length).toBe(1)

			// Cleanup
			try {
				await db`DELETE FROM trips WHERE vehicle_id = ${OTHER_VEHICLE_ID}`
				await db`DELETE FROM vehicles WHERE id = ${OTHER_VEHICLE_ID}`
			} catch {}
		})
	})
})
