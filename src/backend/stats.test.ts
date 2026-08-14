import { describe, it, expect } from "bun:test"
import { DateTime } from "luxon"
import {
	isValidDateFormat,
	parseStatsQuery,
	resolveAnchor,
	formatDateForPeriod
} from "./stats.tsx"

const createMockContext = (query: Record<string, string>) => ({
	req: { query: (name: string) => query[name] },
	text: (body: string, status = 200) => ({ body, status })
} as any)

describe("isValidDateFormat", () => {
	it("accepts valid week format", () => {
		expect(isValidDateFormat("2026-W33", "week")).toBe(true)
		expect(isValidDateFormat("2026-W01", "week")).toBe(true)
	})

	it("rejects invalid week format", () => {
		expect(isValidDateFormat("2026-08", "week")).toBe(false)
		expect(isValidDateFormat("not-a-week", "week")).toBe(false)
	})

	it("accepts valid month format", () => {
		expect(isValidDateFormat("2026-08", "month")).toBe(true)
		expect(isValidDateFormat("2026-01", "month")).toBe(true)
	})

	it("rejects invalid month format", () => {
		expect(isValidDateFormat("2026-W33", "month")).toBe(false)
		expect(isValidDateFormat("not-a-month", "month")).toBe(false)
	})

	it("accepts valid year format", () => {
		expect(isValidDateFormat("2026", "year")).toBe(true)
		expect(isValidDateFormat("1999", "year")).toBe(true)
	})

	it("rejects invalid year format", () => {
		expect(isValidDateFormat("2026-08", "year")).toBe(false)
		expect(isValidDateFormat("not-a-year", "year")).toBe(false)
	})
})

describe("parseStatsQuery", () => {
	it("returns defaults when no query params", () => {
		const result = parseStatsQuery(createMockContext({}))
		expect("error" in result).toBe(false)
		if ("error" in result) return
		expect(result.period).toBe("month")
		expect(result.yearGranularity).toBe("month")
		expect(result.date).toBeUndefined()
	})

	it("accepts valid date per period", () => {
		const r1 = parseStatsQuery(createMockContext({ period: "week", date: "2026-W33" }))
		expect("error" in r1).toBe(false)

		const r2 = parseStatsQuery(createMockContext({ period: "month", date: "2026-08" }))
		expect("error" in r2).toBe(false)

		const r3 = parseStatsQuery(createMockContext({ period: "year", date: "2026" }))
		expect("error" in r3).toBe(false)
	})

	it("rejects invalid date format with 400", () => {
		const r1 = parseStatsQuery(createMockContext({ period: "week", date: "2026-08" }))
		expect("error" in r1).toBe(true)

		const r2 = parseStatsQuery(createMockContext({ period: "month", date: "not-a-date" }))
		expect("error" in r2).toBe(true)

		const r3 = parseStatsQuery(createMockContext({ period: "year", date: "2026-01" }))
		expect("error" in r3).toBe(true)
	})

	it("accepts empty date as undefined", () => {
		const result = parseStatsQuery(createMockContext({ period: "month", date: "" }))
		expect("error" in result).toBe(false)
		if ("error" in result) return
		expect(result.date).toBeUndefined()
	})
})

describe("resolveAnchor", () => {
	it("falls back to now when dateParam is absent", () => {
		const anchor = resolveAnchor(undefined, "month", "Europe/Copenhagen")
		expect(anchor.isValid).toBe(true)
		expect(anchor.hasSame(DateTime.now(), "day")).toBe(true)
	})

	it("parses week date", () => {
		const anchor = resolveAnchor("2026-W33", "week", "Europe/Copenhagen")
		expect(anchor.toFormat("kkkk-'W'WW")).toBe("2026-W33")
	})

	it("parses month date", () => {
		const anchor = resolveAnchor("2026-08", "month", "Europe/Copenhagen")
		expect(anchor.toFormat("yyyy-MM")).toBe("2026-08")
	})

	it("parses year date", () => {
		const anchor = resolveAnchor("2026", "year", "Europe/Copenhagen")
		expect(anchor.toFormat("yyyy")).toBe("2026")
	})
})

describe("formatDateForPeriod", () => {
	it("formats week", () => {
		const dt = DateTime.fromISO("2026-W33", { zone: "Europe/Copenhagen" })
		expect(formatDateForPeriod(dt, "week")).toBe("2026-W33")
	})

	it("formats month", () => {
		const dt = DateTime.fromISO("2026-08-15", { zone: "Europe/Copenhagen" })
		expect(formatDateForPeriod(dt, "month")).toBe("2026-08")
	})

	it("formats year", () => {
		const dt = DateTime.fromISO("2026-08-15", { zone: "Europe/Copenhagen" })
		expect(formatDateForPeriod(dt, "year")).toBe("2026")
	})
})
