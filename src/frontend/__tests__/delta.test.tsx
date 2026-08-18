import { describe, it, expect } from "bun:test"
import { Delta } from "../components/Delta"

describe("Delta", () => {
	it("renders trending-up icon, + sign, and positive class for value > 0", () => {
		const html = String(<Delta value={10} />)
		expect(html).toContain("icon-trending-up")
		expect(html).toContain("+10.0")
		expect(html).toContain('class="delta positive"')
	})

	it("renders trending-down icon, no sign, negative class for value < 0", () => {
		const html = String(<Delta value={-5} />)
		expect(html).toContain("icon-trending-down")
		expect(html).toContain("-5.0")
		expect(html).toContain('class="delta negative"')
	})

	it("renders trending-up-down icon, no sign, neutral class for value === 0", () => {
		const html = String(<Delta value={0} />)
		expect(html).toContain("icon-trending-up-down")
		expect(html).toContain("0.0")
		expect(html).not.toContain("positive")
		expect(html).not.toContain("negative")
	})

	it("renders nothing when value is null", () => {
		const html = String(<Delta value={null} />)
		expect(html).toBe("")
	})

	it("does not render a unit or period suffix", () => {
		const html = String(<Delta value={10} />)
		expect(html).not.toContain("vs last")
		expect(html).not.toContain("km")
	})
})
