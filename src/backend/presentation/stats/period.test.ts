import { describe, it, expect } from "bun:test"

import { DateTime } from "luxon"

import { resolveAnchor, formatDate } from "./period"

describe(resolveAnchor.name, () => {
	it("falls back to now when dateParam is absent", () => {
		const anchor = resolveAnchor("month", undefined, "Europe/Copenhagen")
		expect(anchor.isValid).toBe(true)
		expect(anchor.hasSame(DateTime.now(), "day")).toBe(true)
	})

	it("parses week date", () => {
		const anchor = resolveAnchor("week", "2026-W33", "Europe/Copenhagen")
		expect(anchor.toFormat("kkkk-'W'WW")).toBe("2026-W33")
	})

	it("parses month date", () => {
		const anchor = resolveAnchor("month", "2026-08", "Europe/Copenhagen")
		expect(anchor.toFormat("yyyy-MM")).toBe("2026-08")
	})

	it("parses year date", () => {
		const anchor = resolveAnchor("year", "2026", "Europe/Copenhagen")
		expect(anchor.toFormat("yyyy")).toBe("2026")
	})
})

describe(formatDate.name, () => {
	it("formats week", () => {
		const dt = DateTime.fromISO("2026-W33", { zone: "Europe/Copenhagen" })
		expect(formatDate("week", dt)).toBe("2026-W33")
	})

	it("formats month", () => {
		const dt = DateTime.fromISO("2026-08-15", { zone: "Europe/Copenhagen" })
		expect(formatDate("month", dt)).toBe("2026-08")
	})

	it("formats year", () => {
		const dt = DateTime.fromISO("2026-08-15", { zone: "Europe/Copenhagen" })
		expect(formatDate("year", dt)).toBe("2026")
	})
})
