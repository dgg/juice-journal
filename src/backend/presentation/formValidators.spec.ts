import { describe, expect, it } from "bun:test"

import { toFieldIssues } from "./formValidators"
import { ZodError } from "zod"
import type { TripFormIssues } from "./types"

describe(toFieldIssues.name, () => {
	it("flattens issues", () => {
		const error = new ZodError([
			{ code: "custom", path: ["distance"], message: "must be > 0" },
			{ code: "custom", path: ["end_time"], message: "must be after start" }
		])
		const issues = toFieldIssues(error)
		expect(issues).toEqual({
			distance: "must be > 0",
			end_time: "must be after start"
		})
	})

	it("keeps last message on duplicate paths", () => {
		const error = new ZodError([
			{ code: "custom", path: ["distance"], message: "first" },
			{ code: "custom", path: ["distance"], message: "second" }
		])
		const issues = toFieldIssues(error)
		expect(issues?.distance).toBe("second")
	})

	it("undefined", ()=> {
		expect(toFieldIssues(undefined)).toBeUndefined();
	})
})
