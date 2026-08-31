import { describe, expect, test } from "bun:test"
import { locationCoords } from "./coords"

describe("locationCoords", () => {
	test("valid HOME_LATLNG parsed correctly", () => {
		process.env.HOME_LATLNG = "55.676098,12.568337"
		const result = locationCoords("home")
		expect(result.latitude).toBeCloseTo(55.676098, 6)
		expect(result.longitude).toBeCloseTo(12.568337, 6)
	})

	test("valid WORK_LATLNG parsed correctly", () => {
		process.env.WORK_LATLNG = "56.072723,10.009816"
		const result = locationCoords("work")
		expect(result.latitude).toBeCloseTo(56.072723, 6)
		expect(result.longitude).toBeCloseTo(10.009816, 6)
	})

	test("missing HOME_LATLNG throws", () => {
		delete process.env.HOME_LATLNG
		expect(() => locationCoords("home")).toThrow("HOME_LATLNG is not set")
	})

	test("missing WORK_LATLNG throws", () => {
		delete process.env.WORK_LATLNG
		expect(() => locationCoords("work")).toThrow("WORK_LATLNG is not set")
	})

	test("malformed latlng (no comma) throws", () => {
		process.env.HOME_LATLNG = "55.676098"
		expect(() => locationCoords("home")).toThrow("malformed")
	})

	test("malformed latlng (non-numeric) throws", () => {
		process.env.HOME_LATLNG = "abc,def"
		expect(() => locationCoords("home")).toThrow("malformed")
	})
})