import * as z from "zod"

import { describe, it, expect, type MatcherResult } from "bun:test"

import { tripFormSchema } from "./types"

export type TripForm = z.output<typeof tripFormSchema>
export type TripFormRaw = z.input<typeof tripFormSchema>

const FORM = {
	trip_date: "2026-09-07",
	daypart: "afternoon",
	start_time: "17:00",
	end_time: "17:56",
	distance: "40",
	odometer: "",
	speed: "12",
	consumption: "12",
	start_location: "work",
	end_location: "home",
	vehicle_id: "j0cVfdhdq2nlBvPL"
}

expect.extend({
	toContainIssueFor(actual, prop: string) {
		const mismatch: MatcherResult = {
			pass: false,
			message: `validation error expected to contain issue for '${prop}'`
		}
		const possibleError = actual as z.ZodError | undefined
		if (!possibleError) {
			return mismatch
		}

		const hasIssue = possibleError.issues.some((i) => i.path[0] === prop)
		return hasIssue ? { pass: true } : mismatch
	}
})

interface MyCustomMatchers {
	toContainIssueFor(prop: string): any
}
declare module "bun:test" {
	interface Matchers<T> extends MyCustomMatchers {}
	interface AsymmetricMatchers extends MyCustomMatchers {}
}

describe("form validation", () => {
	describe(z.safeParse.name, () => {
		describe("invalid", () => {
			describe("trip_date", () => {
				it("parsed", () => {
					const invalid = {
						...FORM,
						trip_date: "2026-13-01"
					}
					const parsed = tripFormSchema.safeParse(invalid)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("trip_date")
				})
			})

			describe("start_time", () => {
				it("invalid time", () => {
					const invalid = {
						...FORM,
						start_time: "25:01"
					}
					const parsed = tripFormSchema.safeParse(invalid)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("start_time")
				})
				it("too precise", () => {
					const tooPrecise = {
						...FORM,
						start_time: "03:15:00"
					}
					const parsed = tripFormSchema.safeParse(tooPrecise)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("start_time")
				})
				it("not precise enough", () => {
					const notPrecise = {
						...FORM,
						start_time: "03"
					}
					const parsed = tripFormSchema.safeParse(notPrecise)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("start_time")
				})
			})

			describe("end_time", () => {
				it("too precise", () => {
					const tooPrecise = {
						...FORM,
						end_time: "03:15:00"
					}
					const parsed = tripFormSchema.safeParse(tooPrecise)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_time")
				})
				it("not precise enough", () => {
					const notPrecise = {
						...FORM,
						end_time: "03"
					}
					const parsed = tripFormSchema.safeParse(notPrecise)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_time")
				})
				it("invalid time", () => {
					const invalid = {
						...FORM,
						end_time: "00:61"
					}
					const parsed = tripFormSchema.safeParse(invalid)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_time")
				})
				it("before start_tie", ()=> {
					const invalid = {
						...FORM,
						start_time: "12:00",
						end_time: "11:01"
					}
					const parsed = tripFormSchema.safeParse(invalid)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_time")
				})
			})

			describe("distance", () => {
				describe("optional", () => {
					it("missing", () => {
						const { distance, ...missing } = FORM
						const parsed = tripFormSchema.safeParse(missing)
						expect(parsed.success).toBeFalse()
						expect(parsed.error).toContainIssueFor("distance")
					})
					it("undefined", () => {
						const udefined = { ...FORM, distance: undefined }
						const parsed = tripFormSchema.safeParse(udefined)
						expect(parsed.success).toBeFalse()
						expect(parsed.error).toContainIssueFor("distance")
					})
					it("null", () => {
						const nil = { ...FORM, distance: null }
						const parsed = tripFormSchema.safeParse(nil)
						expect(parsed.success).toBeFalse()
						expect(parsed.error).toContainIssueFor("distance")
					})
					it("empty", () => {
						const empty = { ...FORM, distance: "" }
						const parsed = tripFormSchema.safeParse(empty)
						expect(parsed.success).toBeFalse()
						expect(parsed.error).toContainIssueFor("distance")
					})
				})
				it("numeric", () => {
					const nonNumeric = { ...FORM, distance: "hola" }
					const parsed = tripFormSchema.safeParse(nonNumeric)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("distance")
				})
				it("zero", () => {
					const zero = { ...FORM, distance: "0" }
					const parsed = tripFormSchema.safeParse(zero)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("distance")
				})

				it("negative", () => {
					const negative = { ...FORM, distance: "-2" }
					const parsed = tripFormSchema.safeParse(negative)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("distance")
				})
				it("positive", () => {
					const positive = { ...FORM, distance: "42.1" }
					const parsed = tripFormSchema.safeParse(positive)
					expect(parsed.success).toBeTrue()
					expect(parsed.data?.distance).toEqual(42.1)
				})
			})

			describe("speed", () => {
				describe("optional", () => {
					it("missing", () => {
						const {speed, ...missing} = FORM
						const parsed = tripFormSchema.safeParse(missing)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.speed).toBeUndefined()
					})
					it("undefined", () => {
						const udefined = {...FORM, speed: undefined}
						const parsed = tripFormSchema.safeParse(udefined)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.speed).toBeUndefined()
					})
					it("null", () => {
						const nil = { ...FORM, speed: null }
						const parsed = tripFormSchema.safeParse(nil)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.speed).toBeUndefined()
					})
					it("empty", () => {
						const empty = { ...FORM, speed: "" }
						const parsed = tripFormSchema.safeParse(empty)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.speed).toBeUndefined()
					})
				})
				it("numeric", () => {
					const nonNumeric = { ...FORM, speed: "hola" }
					const parsed = tripFormSchema.safeParse(nonNumeric)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("speed")
				})
				it("zero", () => {
					const zero = { ...FORM, speed: "0" }
					const parsed = tripFormSchema.safeParse(zero)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("speed")
				})

				it("negative", () => {
					const negative = { ...FORM, speed: "-2" }
					const parsed = tripFormSchema.safeParse(negative)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("speed")
				})
				it("positive", () => {
					const positive = { ...FORM, speed: 42.1 }
					const parsed = tripFormSchema.safeParse(positive)
					expect(parsed.success).toBeTrue()
					expect(parsed.data?.speed).toEqual(42.1)
				})
			})

			describe("consumption", () => {
				describe("optional", () => {
					it("missing", () => {
						const { consumption, ...missing } = FORM
						const parsed = tripFormSchema.safeParse(missing)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.consumption).toBeUndefined()
					})
					it("undefined", () => {
						const udefined = { ...FORM, consumption: undefined }
						const parsed = tripFormSchema.safeParse(udefined)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.consumption).toBeUndefined()
					})
					it("null", () => {
						const nil = { ...FORM, consumption: null }
						const parsed = tripFormSchema.safeParse(nil)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.consumption).toBeUndefined()
					})
					it("empty", () => {
						const empty = { ...FORM, consumption: "" }
						const parsed = tripFormSchema.safeParse(empty)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.consumption).toBeUndefined()
					})
				})
				it("numeric", () => {
					const nonNumeric = { ...FORM, consumption: "hola" }
					const parsed = tripFormSchema.safeParse(nonNumeric)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("consumption")
				})
				it("zero", () => {
					const zero = { ...FORM, consumption: "0" }
					const parsed = tripFormSchema.safeParse(zero)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("consumption")
				})

				it("negative", () => {
					const negative = { ...FORM, consumption: "-2" }
					const parsed = tripFormSchema.safeParse(negative)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("consumption")
				})
				it("positive", () => {
					const positive = { ...FORM, consumption: "42.1" }
					const parsed = tripFormSchema.safeParse(positive)
					expect(parsed.success).toBeTrue()
					expect(parsed.data?.consumption).toEqual(42.1)
				})
			})

			describe("odometer", () => {
				describe("optional", () => {
					it("missing", () => {
						const { odometer, ...missing } = FORM
						const parsed = tripFormSchema.safeParse(missing)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.odometer).toBeUndefined()
					})
					it("undefined", () => {
						const udefined = { ...FORM, odometer: undefined }
						const parsed = tripFormSchema.safeParse(udefined)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.odometer).toBeUndefined()
					})
					it("null", () => {
						const nil = { ...FORM, odometer: null }
						const parsed = tripFormSchema.safeParse(nil)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.odometer).toBeUndefined()
					})
					it("empty", () => {
						const empty = { ...FORM, odometer: "" }
						const parsed = tripFormSchema.safeParse(empty)
						expect(parsed.success).toBeTrue()
						expect(parsed.data!.odometer).toBeUndefined()
					})
				})
				it("numeric", () => {
					const nonNumeric = { ...FORM, odometer: "hola" }
					const parsed = tripFormSchema.safeParse(nonNumeric)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("odometer")
				})
				it("zero", () => {
					const zero = { ...FORM, odometer: "0" }
					const parsed = tripFormSchema.safeParse(zero)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("odometer")
				})

				it("negative", () => {
					const negative = { ...FORM, odometer: "-2" }
					const parsed = tripFormSchema.safeParse(negative)
					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("odometer")
				})
				it("positive", () => {
					const positive = { ...FORM, odometer: "42.1" }
					const parsed = tripFormSchema.safeParse(positive)
					expect(parsed.success).toBeTrue()
					expect(parsed.data?.odometer).toEqual(42.1)
				})
			})

			describe("start_location", ()=> {
				it("not enum", ()=> {
					const notLocation = {
						...FORM,
						start_location: "somewhere"
					}
					const parsed = tripFormSchema.safeParse(notLocation)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("start_location")
				})
				it("CAPS", () => {
					const notLocation = {
						...FORM,
						start_location: "HOME"
					}
					const parsed = tripFormSchema.safeParse(notLocation)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("start_location")
				})
			})

			describe("end_location", () => {
				it("not enum", () => {
					const notLocation = {
						...FORM,
						end_location: "somewhere"
					}
					const parsed = tripFormSchema.safeParse(notLocation)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_location")
				})
				it("CAPS", () => {
					const notLocation = {
						...FORM,
						end_location: "HOME"
					}
					const parsed = tripFormSchema.safeParse(notLocation)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_location")
				})
				it("same as start", () => {
					const notLocation = {
						...FORM,
						start_location: "home",
						end_location: "home"
					}
					const parsed = tripFormSchema.safeParse(notLocation)

					expect(parsed.success).toBeFalse()
					expect(parsed.error).toContainIssueFor("end_location")
				})
			})
		})
	})
})
