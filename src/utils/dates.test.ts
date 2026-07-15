import { describe, it, expect } from "bun:test"
import { resolveDisplayTz, currentMonthBoundsUtc } from "./dates"
import { DateTime } from "luxon"

describe("resolveDisplayTz", () => {
	it("prioritizes end location timezone", () => {
		const result = resolveDisplayTz("Europe/Copenhagen", "UTC")
		expect(result).toBe("Europe/Copenhagen")
	})

	it("falls back to start location when end is missing", () => {
		const result = resolveDisplayTz(null, "America/New_York")
		expect(result).toBe("America/New_York")
	})

	it("falls back to config default when both locations missing", () => {
		const result = resolveDisplayTz(null, null, "Europe/Copenhagen")
		expect(result).toBe("Europe/Copenhagen")
	})

	it("treats empty strings as missing", () => {
		const result = resolveDisplayTz("", "", "Europe/Copenhagen")
		expect(result).toBe("Europe/Copenhagen")
	})

	it("uses default Europe/Copenhagen when no fallback provided", () => {
		const result = resolveDisplayTz(null, null)
		expect(result).toBe("Europe/Copenhagen")
	})

	it("prefers start location over default fallback", () => {
		const result = resolveDisplayTz(null, "UTC", "Europe/Copenhagen")
		expect(result).toBe("UTC")
	})
})

describe("currentMonthBoundsUtc", () => {
	it("computes mid-month Copenhagen bounds correctly", () => {
		// July 15, 2026, 10:00 Copenhagen (UTC+2)
		const now = DateTime.fromISO("2026-07-15T10:00:00", { zone: "Europe/Copenhagen" })
		const { startUtc, endUtc } = currentMonthBoundsUtc("Europe/Copenhagen", now)

		// July 1, 2026 00:00 Copenhagen (UTC+2) = June 30, 2026 22:00 UTC
		expect(startUtc).toBe("2026-06-30T22:00:00.000Z")

		// August 1, 2026 00:00 Copenhagen (UTC+2) = July 31, 2026 22:00 UTC
		expect(endUtc).toBe("2026-07-31T22:00:00.000Z")
	})

	it("computes UTC zone midnight bounds", () => {
		const now = DateTime.fromISO("2026-07-15T10:00:00Z")
		const { startUtc, endUtc } = currentMonthBoundsUtc("UTC", now)

		expect(startUtc).toBe("2026-07-01T00:00:00.000Z")
		expect(endUtc).toBe("2026-08-01T00:00:00.000Z")
	})

	it("excludes next month's first instant via exclusive end", () => {
		const now = DateTime.fromISO("2026-07-15T10:00:00Z")
		const { startUtc, endUtc } = currentMonthBoundsUtc("UTC", now)

		// August 1, 2026 00:00 UTC exactly matches endUtc (as UTC ISO string)
		expect(endUtc).toMatch(/2026-08-01T00:00:00/)
		
		// Verify it's in UTC format (Z suffix)
		expect(endUtc).toMatch(/Z$/)
	})

	it("handles DST transition correctly (March spring-forward)", () => {
		// March 20, 2026 noon Copenhagen, after the spring-forward
		const now = DateTime.fromISO("2026-03-20T12:00:00", { zone: "Europe/Copenhagen" })
		const { startUtc, endUtc } = currentMonthBoundsUtc("Europe/Copenhagen", now)

		// March 1, 2026 00:00 Copenhagen (UTC+1) = Feb 28, 2026 23:00 UTC
		expect(startUtc).toBe("2026-02-28T23:00:00.000Z")

		// April 1, 2026 00:00 Copenhagen (UTC+2) = March 31, 2026 22:00 UTC
		expect(endUtc).toBe("2026-03-31T22:00:00.000Z")
	})

	it("uses current system time when now is not provided", () => {
		const { startUtc, endUtc } = currentMonthBoundsUtc("UTC")

		// Should parse without error
		const start = DateTime.fromISO(startUtc)
		const end = DateTime.fromISO(endUtc)

		expect(start.isValid).toBe(true)
		expect(end.isValid).toBe(true)

		// End should be after start
		expect(end > start).toBe(true)
	})
})
