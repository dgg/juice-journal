import { describe, it, expect } from "bun:test"
import { StatsChartsFragment } from "../fragments/StatsChartsFragment"

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
})
