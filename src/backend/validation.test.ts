import { describe, it, expect } from "bun:test"
import { tripInputSchema } from "./types"

describe("Trip Input Schema (Zod)", () => {
	describe("Required Fields", () => {
		it("should reject missing vehicle_id", () => {
			const result = tripInputSchema.safeParse({
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(
					result.error.issues.some((i) => i.path.includes("vehicle_id"))
				).toBe(true)
			}
		})

		it("should reject missing distance_km", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(
					result.error.issues.some((i) => i.path.includes("distance_km"))
				).toBe(true)
			}
		})
	})

	describe("Type Validation", () => {
		it("should reject non-numeric distance_km", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: "not a number"
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(
					result.error.issues.some((i) => i.path.includes("distance_km"))
				).toBe(true)
			}
		})
	})

	describe("Daypart Validation", () => {
		it("should reject invalid daypart", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "evening",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues.some((i) => i.path.includes("daypart"))).toBe(
					true
				)
			}
		})

		it("should accept 'morning' and 'afternoon'", () => {
			const result1 = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			const result2 = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T14:00:00Z",
				end_time: "2026-07-12T14:45:00Z",
				daypart: "afternoon",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result1.success).toBe(true)
			expect(result2.success).toBe(true)
		})
	})

	describe("Distance Validation", () => {
		it("should reject distance_km <= 0", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 0
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(
					result.error.issues.some((i) => i.path.includes("distance_km"))
				).toBe(true)
			}
		})
	})

	describe("Timestamp Validation", () => {
		it("should reject invalid ISO 8601 timestamps", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "not a timestamp",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(
					result.error.issues.some((i) => i.path.includes("start_time"))
				).toBe(true)
			}
		})
	})

	describe("Optional Fields", () => {
		it("should accept valid optional fields", () => {
			const result = tripInputSchema.safeParse({
				vehicle_id: "V1StGXR8_Z5jdHi6",
				start_time: "2026-07-12T08:00:00Z",
				end_time: "2026-07-12T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5,
				avg_speed_kmh: 20.5,
				avg_consumption_kwh_100km: 15.2
			})

			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.avg_speed_kmh).toBe(20.5)
			}
		})
	})

	describe("Multiple Field Errors", () => {
		it("should return multiple field errors together", () => {
			const result = tripInputSchema.safeParse({
				daypart: "evening",
				duration_min: 45
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThanOrEqual(4)
				const paths = result.error.issues.map((i) => i.path.join("."))
				expect(paths).toContain("vehicle_id")
				expect(paths).toContain("start_time")
				expect(paths).toContain("end_time")
				expect(paths).toContain("distance_km")
			}
		})
	})
})
