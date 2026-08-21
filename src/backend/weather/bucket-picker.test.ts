import { describe, it, expect } from "bun:test"
import { nearestBucket } from "./bucket-picker"

describe("nearestBucket", () => {
	it("returns the index of the exact match", () => {
		const times = ["2026-07-20T08:00:00Z", "2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"]
		const idx = nearestBucket(times, "2026-07-20T09:00:00Z")
		expect(idx).toBe(1)
	})

	it("picks the closer bucket when between two", () => {
		const times = ["2026-07-20T08:00:00Z", "2026-07-20T09:00:00Z"]
		const idx = nearestBucket(times, "2026-07-20T08:23:00Z")
		expect(idx).toBe(0)
	})

	it("picks the later bucket when closer to the midpoint on the high side", () => {
		const times = ["2026-07-20T08:00:00Z", "2026-07-20T09:00:00Z"]
		const idx = nearestBucket(times, "2026-07-20T08:38:00Z")
		expect(idx).toBe(1)
	})

	it("returns -1 for an empty array", () => {
		const idx = nearestBucket([], "2026-07-20T08:00:00Z")
		expect(idx).toBe(-1)
	})

	it("returns 0 for a single-element array", () => {
		const idx = nearestBucket(["2026-07-20T08:00:00Z"], "2026-07-20T09:00:00Z")
		expect(idx).toBe(0)
	})

	it("picks earliest bucket when target is before all", () => {
		const times = ["2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"]
		const idx = nearestBucket(times, "2026-07-20T08:00:00Z")
		expect(idx).toBe(0)
	})

	it("picks latest bucket when target is after all", () => {
		const times = ["2026-07-20T08:00:00Z", "2026-07-20T09:00:00Z"]
		const idx = nearestBucket(times, "2026-07-20T11:00:00Z")
		expect(idx).toBe(1)
	})
})