import { describe, it, expect } from "bun:test"
import { Delta } from "../components/Delta"

describe("Delta", () => {
	it("renders trending-up icon, + sign, positive class, and vs last month by default", () => {
		const html = String(<Delta value={10} unit="km" />)
		expect(html).toContain("icon-trending-up")
		expect(html).toContain("+10.0 km vs last month")
		expect(html).toContain('class="delta positive"')
	})

	it("renders trending-down icon, no sign, negative class for value < 0", () => {
		const html = String(<Delta value={-5} unit="km" period="week" />)
		expect(html).toContain("icon-trending-down")
		expect(html).toContain("-5.0 km vs last week")
		expect(html).toContain('class="delta negative"')
	})

	it("renders trending-up-down icon, no sign, neutral class for value === 0", () => {
		const html = String(<Delta value={0} unit="km" />)
		expect(html).toContain("icon-trending-up-down")
		expect(html).toContain("0.0 km vs last month")
		expect(html).not.toContain("positive")
		expect(html).not.toContain("negative")
	})

	it("renders nothing when value is null", () => {
		const html = String(<Delta value={null} unit="km" />)
		expect(html).toBe("")
	})

	it("uses vs last week for period=week", () => {
		const html = String(<Delta value={10} unit="km" period="week" />)
		expect(html).toContain("vs last week")
		expect(html).not.toContain("vs last month")
		expect(html).not.toContain("vs last year")
	})

	it("uses vs last year for period=year", () => {
		const html = String(<Delta value={10} unit="km" period="year" />)
		expect(html).toContain("vs last year")
		expect(html).not.toContain("vs last month")
		expect(html).not.toContain("vs last week")
	})

	it("uses vs last month for period=month", () => {
		const html = String(<Delta value={10} unit="km" period="month" />)
		expect(html).toContain("vs last month")
	})
})
