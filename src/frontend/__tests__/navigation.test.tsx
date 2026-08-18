import { describe, it, expect } from "bun:test"
import { StickyCta } from "../components/StickyCta"
import { Header } from "../components/Header"
import { HomePage } from "../pages/HomePage"
import { StatsPage } from "../pages/StatsPage"

describe("StickyCta", () => {
	it("renders multiple actions", () => {
		const html = String(
			<StickyCta
				actions={[
					{ href: "/stats", label: "Stats", variant: "secondary" },
					{ href: "/trips/new", label: "Log new trip" }
				]}
			/>
		)
		expect(html).toContain('href="/stats"')
		expect(html).toContain('href="/trips/new"')
		expect(html).toContain(">Stats<")
		expect(html).toContain(">Log new trip<")
	})

	it("renders single action via legacy props", () => {
		const html = String(<StickyCta href="/" label="Home" />)
		expect(html).toContain('href="/"')
		expect(html).toContain(">Home<")
	})

	it("uses contrast variant by default", () => {
		const html = String(<StickyCta href="/" label="Home" />)
		expect(html).toContain('class="contrast"')
	})

	it("accepts secondary variant", () => {
		const html = String(
			<StickyCta actions={[{ href: "/x", label: "X", variant: "secondary" }]} />
		)
		expect(html).toContain('class="secondary"')
	})

	it("renders icon span before label when icon is provided", () => {
		const html = String(
			<StickyCta
				actions={[{ href: "/trips/new", label: "Log new trip", icon: "plus" }]}
			/>
		)
		expect(html).toContain('<span class="icon-plus" aria-hidden="true"></span>')
		expect(html).toContain(">Log new trip<")
	})

	it("renders no icon span when icon is omitted", () => {
		const html = String(<StickyCta href="/" label="Home" />)
		expect(html).not.toContain("icon-")
		expect(html).toContain(">Home<")
	})

	it("renders submit action as a button with type submit", () => {
		const html = String(
			<StickyCta
				actions={[
					{ href: "/", label: "Back", variant: "secondary" },
					{ label: "Save trip", type: "submit", icon: "save" }
				]}
			/>
		)
		expect(html).toContain('<button type="submit" class="contrast">')
		expect(html).toContain('<span class="icon-save" aria-hidden="true"></span>')
		expect(html).toContain(">Save trip<")
	})

	it("renders regular actions as anchors when type is not submit", () => {
		const html = String(
			<StickyCta
				actions={[
					{ href: "/", label: "Back", variant: "secondary" },
					{ label: "Save trip", type: "submit" }
				]}
			/>
		)
		expect(html).toContain('<a href="/" role="button" class="secondary">')
		expect(html).toContain(">Back<")
	})
})

describe("HomePage", () => {
	const emptyStats = {
		totalDistance: { value: null, prev: null },
		totalTime: { value: null, prev: null },
		totalTimeHm: null,
		avgSpeed: { value: null, prev: null },
		avgDuration: { value: null, prev: null },
		avgDurationHm: null,
		avgConsumption: { value: null, prev: null },
		tripCount: { value: null, prev: null },
		period: "month" as const
	}

	it("renders anchor to /stats in sticky CTA", () => {
		const html = String(
			<HomePage
				data={{
					vehicle: null,
					monthLabel: "August 2026",
					stats: emptyStats,
					trips: [],
					hasTrips: false
				}}
			/>
		)
		expect(html).toContain('href="/stats"')
		expect(html).toContain(">Stats</a>")
	})

	it("renders anchor to /trips/new in sticky CTA", () => {
		const html = String(
			<HomePage
				data={{
					vehicle: null,
					monthLabel: "August 2026",
					stats: emptyStats,
					trips: [],
					hasTrips: false
				}}
			/>
		)
		expect(html).toContain('href="/trips/new"')
		expect(html).toContain(">Log new trip</a>")
	})

	it("renders six stat cards", () => {
		const html = String(
			<HomePage
				data={{
					vehicle: null,
					monthLabel: "August 2026",
					stats: {
						totalDistance: { value: 150, prev: null },
						totalTime: { value: 300, prev: null },
						totalTimeHm: "5h",
						avgSpeed: { value: 50, prev: null },
						avgDuration: { value: 30, prev: null },
						avgDurationHm: "30m",
						avgConsumption: { value: 18.5, prev: null },
						tripCount: { value: 10, prev: null },
						period: "month"
					},
					trips: [],
					hasTrips: false
				}}
			/>
		)
		expect(html).toContain("Total distance")
		expect(html).toContain("Total time driven")
		expect(html).toContain("Avg speed")
		expect(html).toContain("Avg duration")
		expect(html).toContain("Avg consumption")
		expect(html).toContain("Trips")
		expect(html).toContain("5h")
		expect(html).toContain("30m")
		expect(html).toContain("150")
		expect(html).toContain("18.5")
	})
})

describe("Header", () => {
	it("renders car-front icon inside badge when vehicle is provided", () => {
		const html = String(<Header month="August 2026" vehicle="Tesla M3" />)
		expect(html).toContain('<span class="icon-car-front" aria-hidden="true"></span>')
		expect(html).toContain("> Tesla M3<")
	})

	it("renders no badge when vehicle is null", () => {
		const html = String(<Header month="August 2026" vehicle={null} />)
		expect(html).not.toContain("badge")
		expect(html).not.toContain("icon-")
	})
})

describe("StatsPage", () => {
	it("renders anchor back to / in sticky CTA", () => {
		const html = String(
			<StatsPage
				data={{
					period: "month",
					yearGranularity: "month",
					label: "August 2026",
					weekBoundsLabel: null,
					vehicle: null,
stats: {
					totalDistance: { value: null, prev: null },
					totalTime: { value: null, prev: null },
					totalTimeHm: null,
					avgSpeed: { value: null, prev: null },
					avgDuration: { value: null, prev: null },
					avgDurationHm: null,
					avgConsumption: { value: null, prev: null },
					tripCount: { value: null, prev: null }
				},
					series: {
						labels: [],
						distance: [],
						duration: [],
						speed: [],
						consumption: []
					},
					hasTrips: false,
					date: "2026-08",
					prevDate: "2026-07",
					nextDate: null,
					yearOptions: []
				}}
			/>
		)
		expect(html).toContain('href="/"')
		expect(html).toContain(">Back</a>")
	})
})
