import { describe, it, expect } from "bun:test"

import { statsQuerySchema } from "./types"

describe("statsQuerySchema", () => {
	it("returns defaults when no query params", () => {
		const parsed = statsQuerySchema.safeParse({})
		expect(parsed.success).toBeTrue()

		expect(parsed.data?.period).toBe("month")
		expect(parsed.data?.yearGranularity).toBe("month")
		expect(parsed.data?.date).toBeUndefined()
	})

	it("accepts valid date per period", () => {
		const r1 = statsQuerySchema.safeParse({ period: "week", date: "2026-W33" })
		expect(r1.success).toBeTrue()
		expect(r1.data?.period).toBe("week")
		expect(r1.data?.date).toBe("2026-W33")

		const r2 = statsQuerySchema.safeParse({ period: "month", date: "2026-08" })
		expect(r2.success).toBeTrue()
		expect(r2.data?.period).toBe("month")
		expect(r2.data?.date).toBe("2026-08")

		const r3 = statsQuerySchema.safeParse({ period: "year", date: "2026" })
		expect(r3.success).toBeTrue()
		expect(r3.data?.period).toBe("year")
		expect(r3.data?.date).toBe("2026")
	})

	it("accepts any valid date format regardless of period", () => {
		const r1 = statsQuerySchema.safeParse({ period: "week", date: "2026-08" })
		expect(r1.success).toBeTrue()

		const r2 = statsQuerySchema.safeParse({ period: "year", date: "2026-01" })
		expect(r2.success).toBeTrue()
	})

	it("rejects malformed date with 400", () => {
		const r1 = statsQuerySchema.safeParse({ period: "week", date: "not-a-date" })
		expect(r1.success).toBeFalse()

		const r2 = statsQuerySchema.safeParse({ period: "month", date: "2026-08-15" })
		expect(r2.success).toBeFalse()
	})

	it("accepts empty date as undefined", () => {
		let result = statsQuerySchema.safeParse({ period: "month", date: "" })
		expect(result.success).toBeTrue()
		expect(result.data?.date).toBeUndefined()

		result = statsQuerySchema.safeParse({ period: "month", date: undefined })
		expect(result.success).toBeTrue()
		expect(result.data?.date).toBeUndefined()

		result = statsQuerySchema.safeParse({ period: "month" })
		expect(result.success).toBeTrue()
		expect(result.data?.date).toBeUndefined()
	})
})
