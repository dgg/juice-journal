import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../db/client"

const TEST_VEHICLE_ID = "550e8400-e29b-41d4-a716-446655440000"
const TEST_LOCATION_ID = "550e8400-e29b-41d4-a716-446655440001"

// Setup and teardown
beforeAll(async () => {
	// Create test data
	// Insert test vehicle
	try {
		await db`
      INSERT INTO vehicles (id, description)
      VALUES (${TEST_VEHICLE_ID}::uuid, 'Test Vehicle')
    `
	} catch {}

	// Insert test locations
	try {
		await db`
      INSERT INTO locations (id, label, latitude, longitude, timezone)
      VALUES (${TEST_LOCATION_ID}::uuid, 'Home', 55.676098, 12.568337, 'Europe/Copenhagen')
    `
	} catch {}
})

afterAll(async () => {
	// Clean up test data
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}::uuid`
		await db`DELETE FROM vehicles WHERE id = ${TEST_VEHICLE_ID}::uuid`
		await db`DELETE FROM locations WHERE id = ${TEST_LOCATION_ID}::uuid`
	} catch {}
})

describe("Trips API Database", () => {
	describe("Schema Validation", () => {
		it("should have vehicles table", async () => {
			const result = await db`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'vehicles'
        ) as exists
      `
			expect(result[0].exists).toBe(true)
		})

		it("should have trips table", async () => {
			const result = await db`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'trips'
        ) as exists
      `
			expect(result[0].exists).toBe(true)
		})

		it("should have locations table", async () => {
			const result = await db`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'locations'
        ) as exists
      `
			expect(result[0].exists).toBe(true)
		})
	})

	describe("Trip Creation", () => {
		it("should insert a trip with all fields", async () => {
			const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km,
          avg_speed_kmh,
          avg_consumption_kwh_100km
        )
        VALUES (
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-01T08:00:00Z',
          '2026-07-01T08:45:00Z',
          'morning',
          45,
          15.5,
          20.0,
          15.5
        )
        RETURNING *
      `

			expect(result.length).toBe(1)
			expect(result[0].daypart).toBe("morning")
			expect(result[0].duration_min).toBe(45)
		})

		it("should store duration_min as provided", async () => {
			const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-02T08:00:00Z',
          '2026-07-02T08:45:00Z',
          'morning',
          40,
          20.0
        )
        RETURNING duration_min
      `

			expect(result[0].duration_min).toBe(40)
		})
	})

	describe("Daypart Enum", () => {
		it("should accept 'morning' daypart", async () => {
			const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-07T08:00:00Z',
          '2026-07-07T08:45:00Z',
          'morning',
          45,
          10.0
        )
        RETURNING daypart
      `

			expect(result[0].daypart).toBe("morning")
		})

		it("should accept 'afternoon' daypart", async () => {
			const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-08T14:00:00Z',
          '2026-07-08T14:45:00Z',
          'afternoon',
          45,
          10.0
        )
        RETURNING daypart
      `

			expect(result[0].daypart).toBe("afternoon")
		})

		it("should reject invalid daypart", async () => {
			try {
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
            ${TEST_VEHICLE_ID}::uuid,
            '2026-07-09T20:00:00Z',
            '2026-07-09T20:45:00Z',
            'evening',
            45,
            10.0
          )
        `
				expect.fail("Should have thrown enum validation error")
			} catch (error) {
				const errorMsg = String(error)
				expect(errorMsg.includes("invalid") || errorMsg.includes("enum")).toBe(
					true
				)
			}
		})
	})

	describe("Unique Constraint", () => {
		it("should return 409 on duplicate vehicle_id, end_time", async () => {
			// Insert first trip
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
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-04T10:00:00Z',
          '2026-07-04T10:45:00Z',
          'morning',
          45,
          15.0
        )
      `

			// Try to insert duplicate
			try {
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
            ${TEST_VEHICLE_ID}::uuid,
            '2026-07-04T11:00:00Z',
            '2026-07-04T10:45:00Z',
            'afternoon',
            30,
            10.0
          )
        `
				expect.fail("Should have thrown unique constraint violation")
			} catch (error) {
				const errorMsg = String(error)
				expect(
					errorMsg.includes("UNIQUE") ||
						errorMsg.includes("duplicate") ||
						errorMsg.includes("Uniqueness")
				).toBe(true)
			}
		})
	})

	describe("Foreign Key Constraints", () => {
		it("should reject invalid vehicle_id FK", async () => {
			try {
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
            'a5000000-0000-0000-0000-000000000000'::uuid,
            '2026-07-05T08:00:00Z',
            '2026-07-05T08:45:00Z',
            'morning',
            45,
            10.0
          )
        `
				expect.fail("Should have thrown foreign key constraint")
			} catch (error) {
				const errorMsg = String(error)
				expect(errorMsg.includes("foreign key") || errorMsg.includes("Key")).toBe(
					true
				)
			}
		})

		it("should reject invalid location_id FK", async () => {
			try {
				await db`
          INSERT INTO trips (
            vehicle_id,
            start_time,
            end_time,
            daypart,
            duration_min,
            distance_km,
            start_location_id
          )
          VALUES (
            ${TEST_VEHICLE_ID}::uuid,
            '2026-07-06T08:00:00Z',
            '2026-07-06T08:45:00Z',
            'morning',
            45,
            10.0,
            'a5000000-0000-0000-0000-000000000000'::uuid
          )
        `
				expect.fail("Should have thrown foreign key constraint")
			} catch (error) {
				const errorMsg = String(error)
				expect(errorMsg.includes("foreign key") || errorMsg.includes("Key")).toBe(
					true
				)
			}
		})
	})

	describe("Timestamps", () => {
		it("should set tracking_created and tracking_updated", async () => {
			const result = await db`
        INSERT INTO trips (
          vehicle_id,
          start_time,
          end_time,
          daypart,
          duration_min,
          distance_km
        )
        VALUES (
          ${TEST_VEHICLE_ID}::uuid,
          '2026-07-10T08:00:00Z',
          '2026-07-10T08:45:00Z',
          'morning',
          45,
          10.0
        )
        RETURNING tracking_created, tracking_updated
      `

			expect(result[0].tracking_created).toBeDefined()
			expect(result[0].tracking_updated).toBeDefined()
		})
	})
})
