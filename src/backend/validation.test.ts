import { describe, it, expect, beforeAll } from "bun:test"
import { db } from "../db/client"
import { validateTripInput } from "../backend/validation"

const TEST_VEHICLE_ID = "550e8400-e29b-41d4-a716-446655440002"

beforeAll(async () => {
	try {
		await db`
      INSERT INTO vehicles (id, description)
      VALUES (${TEST_VEHICLE_ID}::uuid, 'Test Vehicle')
    `
	} catch {}
})

describe("Trip Input Validation", () => {
	describe("Required Fields", () => {
		it("should reject missing vehicle_id", async () => {
			const result = await validateTripInput({
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "vehicle_id")).toBe(true)
		})

		it("should reject missing distance_km", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "distance_km")).toBe(true)
		})
	})

	describe("Type Validation", () => {
		it("should reject non-numeric distance_km", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: "not a number"
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "distance_km")).toBe(true)
		})
	})

	describe("Daypart Validation", () => {
		it("should reject invalid daypart", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "evening",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "daypart")).toBe(true)
		})

		it("should accept 'morning' and 'afternoon'", async () => {
			const result1 = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			const result2 = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T14:00:00Z",
				end_time: "2026-07-12T14:45:00Z",
				daypart: "afternoon",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result1.valid).toBe(true)
			expect(result2.valid).toBe(true)
		})
	})

	describe("Distance Validation", () => {
		it("should reject distance_km <= 0", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 0
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "distance_km")).toBe(true)
		})
	})

	describe("Timestamp Validation", () => {
		it("should reject invalid ISO 8601 timestamps", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "not a timestamp",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "start_time")).toBe(true)
		})
	})

	describe("Vehicle FK Validation", () => {
		it("should reject non-existent vehicle_id", async () => {
			const result = await validateTripInput({
				vehicle_id: "a5000000-0000-0000-0000-000000000000",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.field === "vehicle_id")).toBe(true)
		})

		it("should accept valid vehicle_id", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.valid).toBe(true)
			expect(result.data).toBeDefined()
		})
	})

	describe("Optional Fields", () => {
		it("should accept valid optional fields", async () => {
			const result = await validateTripInput({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5,
				avg_speed_kmh: 20.5,
				avg_consumption_kwh_100km: 15.2,
				weather_start: { temp: 15, wind: 5 }
			})

			expect(result.valid).toBe(true)
			expect(result.data?.avg_speed_kmh).toBe(20.5)
			expect(result.data?.weather_start).toEqual({ temp: 15, wind: 5 })
		})
	})
})
