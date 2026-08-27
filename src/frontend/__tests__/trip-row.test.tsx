import { describe, it, expect } from "bun:test"
import { TripRow } from "../components/TripRow"

describe("TripRow", () => {
	const baseTrip = {
		id: "t1",
		startTime: new Date("2026-08-26T06:00:00Z"),
		endTime: new Date("2026-08-26T06:45:00Z"),
		daypart: "morning",
		durationMin: 45,
		distanceKm: 15,
		avgSpeedKmh: 60,
		avgConsumptionKwh100km: 18.5,
		odometerKm: 50000,
		startLocation: "Home",
		endLocation: "Work",
		weatherStart: null
	}

	const weatherObject = {
		weatherCode: 61,
		temperature: 13,
		humidity: 80,
		precipitation: 0.4,
		wind: { speed: 7, direction: 240 }
	}

	it("renders weather pill with all four data elements when weatherStart is provided", () => {
		const trip = { ...baseTrip, weatherStart: weatherObject }
		const html = String(<TripRow trip={trip} />)

		expect(html).toContain("Weather")
		expect(html).toContain("icon-cloud-rain")
		expect(html).toContain('value="13"')
		expect(html).toContain('value="0.4"')
		expect(html).toContain('value="80"')
		expect(html).toContain('value="7"')
		expect(html).toContain('<small class=\"pill__unit\"> mm</small>')
		expect(html).toContain('<small class="pill__unit">%</small>')
		expect(html).toContain('<span class="pill__unit">°</span>')
		expect(html).toContain('<small class="pill__unit"> m/s</small>')
	})

	it("does not render weather pill when weatherStart is null", () => {
		const html = String(<TripRow trip={baseTrip} />)

		expect(html).not.toContain("Weather")
		expect(html).not.toContain("icon-cloud-rain")
		expect(html).not.toContain("icon-umbrella")
		expect(html).not.toContain("icon-droplets")
		expect(html).not.toContain("icon-wind")
	})

	it("renders wind-from-sw class for direction 240", () => {
		const trip = { ...baseTrip, weatherStart: weatherObject }
		const html = String(<TripRow trip={trip} />)

		expect(html).toContain("icon-mouse-pointer-2")
		expect(html).toContain("wind-from-sw")
	})

	it("omits wind arrow when wind.direction is null", () => {
		const noDirWeather = { ...weatherObject, wind: { speed: 7, direction: null } }
		const trip = { ...baseTrip, weatherStart: noDirWeather }
		const html = String(<TripRow trip={trip} />)

		expect(html).not.toContain("icon-mouse-pointer-2")
		expect(html).toContain("icon-wind")
		expect(html).toContain('value="7"')
	})
})
