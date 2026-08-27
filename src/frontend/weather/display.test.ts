import { describe, it, expect } from "bun:test"
import { weatherCodeToIcon, windDirectionToClass, FALLBACK_ICON } from "./display"

describe("weatherCodeToIcon", () => {
	it("maps code 0 to icon-sun", () => {
		expect(weatherCodeToIcon(0)).toBe("icon-sun")
	})
	it("maps codes 1-2 to icon-cloud-sun", () => {
		expect(weatherCodeToIcon(1)).toBe("icon-cloud-sun")
		expect(weatherCodeToIcon(2)).toBe("icon-cloud-sun")
	})
	it("maps code 3 to icon-cloudy", () => {
		expect(weatherCodeToIcon(3)).toBe("icon-cloudy")
	})
	it("maps codes 45/48 to icon-cloud-fog", () => {
		expect(weatherCodeToIcon(45)).toBe("icon-cloud-fog")
		expect(weatherCodeToIcon(48)).toBe("icon-cloud-fog")
	})
	it("maps drizzle codes to icon-cloud-drizzle", () => {
		for (const c of [51, 53, 55, 56, 57])
			expect(weatherCodeToIcon(c)).toBe("icon-cloud-drizzle")
	})
	it("maps rain codes to icon-cloud-rain", () => {
		for (const c of [61, 62, 65, 66, 67, 80, 81, 82])
			expect(weatherCodeToIcon(c)).toBe("icon-cloud-rain")
	})
	it("maps snow codes to icon-cloud-snow", () => {
		for (const c of [71, 73, 75, 77, 85, 86])
			expect(weatherCodeToIcon(c)).toBe("icon-cloud-snow")
	})
	it("maps thunder codes to icon-cloud-lightning", () => {
		for (const c of [95, 96, 99])
			expect(weatherCodeToIcon(c)).toBe("icon-cloud-lightning")
	})
	it("returns fallback for null", () => {
		expect(weatherCodeToIcon(null)).toBe(FALLBACK_ICON)
	})
	it("returns fallback for unknown code", () => {
		expect(weatherCodeToIcon(999)).toBe(FALLBACK_ICON)
	})
})

describe("windDirectionToClass", () => {
	it("returns wind-from-n for 0 and 350 (360 wrap)", () => {
		expect(windDirectionToClass(0)).toBe("wind-from-n")
		expect(windDirectionToClass(350)).toBe("wind-from-n")
	})
	it("returns wind-from-ne for 45", () => {
		expect(windDirectionToClass(45)).toBe("wind-from-ne")
	})
	it("returns wind-from-e for 90", () => {
		expect(windDirectionToClass(90)).toBe("wind-from-e")
	})
	it("returns wind-from-se for 135", () => {
		expect(windDirectionToClass(135)).toBe("wind-from-se")
	})
	it("returns wind-from-s for 180", () => {
		expect(windDirectionToClass(180)).toBe("wind-from-s")
	})
	it("returns wind-from-sw for 225 and 240", () => {
		expect(windDirectionToClass(225)).toBe("wind-from-sw")
		expect(windDirectionToClass(240)).toBe("wind-from-sw")
	})
	it("returns wind-from-w for 270", () => {
		expect(windDirectionToClass(270)).toBe("wind-from-w")
	})
	it("returns wind-from-nw for 315", () => {
		expect(windDirectionToClass(315)).toBe("wind-from-nw")
	})
	it("returns null for null", () => {
		expect(windDirectionToClass(null)).toBeNull()
	})
	it("handles values >= 360 by wrapping", () => {
		expect(windDirectionToClass(720)).toBe("wind-from-n")
	})
})
