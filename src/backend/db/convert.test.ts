import { describe, it, expect } from "bun:test"

import { toNumber, toUtcDateTime } from "./convert"

describe("convert", () => {
	describe("toNumber", () => {
		it("parses numeric string to number", () => {
			expect(toNumber("15.50")).toBe(15.5)
			expect(toNumber("0")).toBe(0)
			expect(toNumber("-3.14")).toBe(-3.14)
		})

		it("returns null for null/undefined", () => {
			expect(toNumber(null)).toBeNull()
			expect(toNumber(undefined)).toBeNull()
		})

		it("returns null for non-numeric string", () => {
			expect(toNumber("not-a-number")).toBeNull()
		})
	})

	describe("toUtcDateTime", () => {
		it("converts Date to Luxon DateTime in UTC", () => {
			const date = new Date("2026-07-15T10:30:00Z")
			const dt = toUtcDateTime(date)
			expect(dt.zoneName).toBe("UTC")
			expect(dt.toMillis()).toBe(date.getTime())
		})
	})
})
