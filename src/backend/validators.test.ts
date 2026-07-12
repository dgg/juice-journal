import { describe, it, expect, beforeAll } from "bun:test"
import { db } from "../db/client"

const TEST_VEHICLE_ID = "V1StGXR8_Z5jdHi6"

beforeAll(async () => {
	try {
		await db`
      INSERT INTO vehicles (id, description)
      VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')
    `
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
