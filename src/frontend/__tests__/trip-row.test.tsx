import { describe, it, expect } from "bun:test"
import { DateTime } from "luxon"
import { TripRow } from "../components/TripRow"

function dt(s: string) {
	return DateTime.fromISO(s, { setZone: true }).toUTC()
}

describe("TripRow", () => {
	const baseTrip = {
		id: "t1",
		start_time: dt("2026-08-26T06:00:00Z"),
		end_time: dt("2026-08-26T06:45:00Z"),
		daypart: "morning" as const,
		duration: 45,
		distance: 15,
		speed: 60,
		consumption: 18.5,
		odometer: 50000,
		start_location: "Home",
		end_location: "Work",
		weatherStart: null
	}

	const weatherSnapshot = {
		observedAt: dt("2026-08-26T06:00:00Z"),
		weatherCode: 61,
		temperature: 13,
		humidity: 80,
		precipitation: 0.4,
		wind: { speed: 7, direction: 240 }
	}

	it("renders weather pill with all four data elements when weatherStart is provided", () => {
		const trip = { ...baseTrip, weatherStart: weatherSnapshot }
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
		const trip = { ...baseTrip, weatherStart: weatherSnapshot }
		const html = String(<TripRow trip={trip} />)

		expect(html).toContain("icon-mouse-pointer-2")
		expect(html).toContain("wind-from-sw")
	})

	it("omits wind arrow when wind.direction is null", () => {
		const noDirWeather = { ...weatherSnapshot, wind: { speed: 7, direction: null } }
		const trip = { ...baseTrip, weatherStart: noDirWeather }
		const html = String(<TripRow trip={trip} />)

		expect(html).not.toContain("icon-mouse-pointer-2")
		expect(html).toContain("icon-wind")
		expect(html).toContain('value="7"')
	})
})