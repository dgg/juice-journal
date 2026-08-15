import { describe, it, expect } from "bun:test"
import { StatsChartsFragment } from "../fragments/StatsChartsFragment"
import { EmptyState } from "../components/EmptyState"

function makeData(
	overrides: Partial<Parameters<typeof StatsChartsFragment>[0]["data"]> = {}
) {
	return {
		period: "month" as const,
		yearGranularity: "month" as const,
		label: "August 2026",
		vehicle: null,
		stats: {
			totalDistance: { value: 200, prev: 150 },
			avgSpeed: { value: 50, prev: 48 },
			avgDuration: { value: 30, prev: 28 },
			avgDurationHm: "30m" as string | null,
			avgConsumption: { value: 18.5, prev: 19.0 },
			tripCount: { value: 10, prev: 8 }
		},
		series: {
			labels: [] as string[],
			distance: [] as number[],
			duration: [] as number[],
			speed: [] as (number | null)[],
			consumption: [] as (number | null)[]
		},
		hasTrips: false,
		date: "2026-08",
		prevDate: "2026-07",
		nextDate: "2026-09",
		yearOptions: [] as number[],
		...overrides
	}
}

describe("StatsChartsFragment period navigation", () => {
	it("renders month picker with value", () => {
		const html = String(<StatsChartsFragment data={makeData()} />)
		expect(html).toContain('type="month"')
		expect(html).toContain('value="2026-08"')
	})

	it("renders week picker", () => {
		const html = String(
			<StatsChartsFragment data={makeData({ period: "week", date: "2026-W33" })} />
		)
		expect(html).toContain('type="week"')
		expect(html).toContain('value="2026-W33"')
	})

	it("renders year select with options", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "year",
					date: "2025",
					yearOptions: [2026, 2025, 2024]
				})}
			/>
		)
		expect(html).toContain("<select")
		expect(html).toContain(">2026<")
		expect(html).toContain(">2025<")
		expect(html).toContain("selected")
	})

	it("renders prev/next buttons with correct href values", () => {
		const html = String(<StatsChartsFragment data={makeData()} />)
		expect(html).toContain("2026-07")
		expect(html).toContain("2026-09")
	})

	it("disables next button when nextDate is null", () => {
		const html = String(<StatsChartsFragment data={makeData({ nextDate: null })} />)
		expect(html).toContain("disabled")
	})

	it("carries date in period switcher", () => {
		const html = String(<StatsChartsFragment data={makeData()} />)
		expect(html).toContain("2026-08")
	})

	it("carries date in year granularity toggle", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "year",
					date: "2025",
					yearOptions: [2025]
				})}
			/>
		)
		expect(html).toContain("2025")
	})

	it("renders calendar-days icon in month period button", () => {
		const html = String(<StatsChartsFragment data={makeData()} />)
		expect(html).toContain("icon-calendar-days")
	})

	it("renders calendar-1 icon in week period button", () => {
		const html = String(<StatsChartsFragment data={makeData({ period: "week" })} />)
		expect(html).toContain("icon-calendar-1")
	})

	it("renders calendar icon in year period button", () => {
		const html = String(<StatsChartsFragment data={makeData({ period: "year" })} />)
		expect(html).toContain("icon-calendar")
	})

	it("renders icons in year-granularity toggle buttons", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "year",
					yearOptions: [2025]
				})}
			/>
		)
		expect(html).toContain("icon-calendar-days")
		expect(html).toContain("icon-calendar-1")
	})

	it("renders car-front icon and vehicle description in stats period label when vehicle is provided", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					vehicle: { id: "veh_123", description: "Megane E-Tech" }
				})}
			/>
		)
		expect(html).toContain('<span class="icon-car-front" aria-hidden="true"></span>')
		expect(html).toContain("Megane E-Tech")
	})

	it("renders no vehicle info in stats period label when vehicle is null", () => {
		const html = String(<StatsChartsFragment data={makeData({ vehicle: null })} />)
		expect(html).not.toContain("icon-car-front")
	})

	it("renders vs last month suffix for month period delta", () => {
		const html = String(
			<StatsChartsFragment data={makeData({ period: "month", hasTrips: true })} />
		)
		expect(html).toContain("vs last month")
	})

	it("renders vs last week suffix for week period delta", () => {
		const html = String(
			<StatsChartsFragment data={makeData({ period: "week", hasTrips: true })} />
		)
		expect(html).toContain("vs last week")
	})

	it("renders vs last year suffix for year period delta", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "year",
					hasTrips: true,
					date: "2025",
					yearGranularity: "month",
					yearOptions: [2026, 2025]
				})}
			/>
		)
		expect(html).toContain("vs last year")
	})

	it("renders trending-up icon for positive delta", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "month",
					hasTrips: true,
					stats: {
						totalDistance: { value: 200, prev: 150 },
						avgSpeed: { value: 50, prev: 48 },
						avgDuration: { value: 30, prev: 28 },
						avgDurationHm: "30m",
						avgConsumption: { value: 18.5, prev: 19.0 },
						tripCount: { value: 10, prev: 8 }
					}
				})}
			/>
		)
		expect(html).toContain("icon-trending-up")
	})
})

describe("EmptyState", () => {
	it("renders circle-off icon and default message", () => {
		const html = String(<EmptyState />)
		expect(html).toContain('class="icon-circle-off"')
		expect(html).toContain("No trips yet — log your first commute")
	})

	it("renders custom message when provided", () => {
		const html = String(<EmptyState message="Custom empty message" />)
		expect(html).toContain(">Custom empty message<")
		expect(html).toContain('class="icon-circle-off"')
	})

	it("renders no stats message in StatsChartsFragment empty state", () => {
		const html = String(<StatsChartsFragment data={makeData()} />)
		expect(html).toContain("No stats for this period")
		expect(html).toContain('class="icon-circle-off"')
	})
})

describe("Avg duration display", () => {
	it("renders HM string as value and not raw minutes when avgDurationHm is set", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({ period: "month", hasTrips: true })}
			/>
		)
		expect(html).toContain(">30m</data>")
		expect(html).not.toContain(">30</data>")
	})

	it("renders hours-and-minutes format for longer durations", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "month",
					hasTrips: true,
					stats: {
						totalDistance: { value: 200, prev: 150 },
						avgSpeed: { value: 50, prev: 48 },
						avgDuration: { value: 90, prev: 60 },
						avgDurationHm: "1h 30m",
						avgConsumption: { value: 18.5, prev: 19.0 },
						tripCount: { value: 10, prev: 8 }
					}
				})}
			/>
		)
		expect(html).toContain(">1h 30m</data>")
		expect(html).not.toContain(">90<")
	})

	it("renders -- with no unit when avg duration is null", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({
					period: "month",
					hasTrips: true,
					stats: {
						totalDistance: { value: 200, prev: 150 },
						avgSpeed: { value: 50, prev: 48 },
						avgDuration: { value: null, prev: null },
						avgDurationHm: null,
						avgConsumption: { value: 18.5, prev: 19.0 },
						tripCount: { value: 10, prev: 8 }
					}
				})}
			/>
		)
		expect(html).toContain(">--</data>")
		expect(html).not.toContain(">-- <small>")
	})

	it("renders avg-duration delta with min unit suffix", () => {
		const html = String(
			<StatsChartsFragment
				data={makeData({ period: "month", hasTrips: true })}
			/>
		)
		expect(html).toContain("2.0 min")
	})
})
