import { describe, it, expect, beforeAll } from "bun:test"
import { db } from "../db/client"

const TEST_VEHICLE_ID = "550e8400-e29b-41d4-a716-446655440002"

beforeAll(async () => {
	try {
		await db`
      INSERT INTO vehicles (id, description)
      VALUES (${TEST_VEHICLE_ID}::uuid, 'Test Vehicle')
    `
	} catch {}
})

describe("FK Check Middleware (integration via raw DB queries)", () => {
	describe("Vehicle FK", () => {
		it("should detect non-existent vehicle_id", async () => {
			const result = await db`
        SELECT id FROM vehicles WHERE id = 'a5000000-0000-0000-0000-000000000000'
      `
			expect(result.length).toBe(0)
		})

		it("should find existing vehicle_id", async () => {
			const result = await db`
        SELECT id FROM vehicles WHERE id = ${TEST_VEHICLE_ID}::uuid
      `
			expect(result.length).toBe(1)
		})
	})

	describe("Location FK", () => {
		it("should detect non-existent start_location_id", async () => {
			const result = await db`
        SELECT id FROM locations WHERE id = 'a5000000-0000-0000-0000-000000000000'
      `
			expect(result.length).toBe(0)
		})
	})
})
