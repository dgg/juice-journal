import type { FC } from "hono/jsx"

const SUFFIX: Record<string, string> = {
	week: "vs last week",
	month: "vs last month",
	year: "vs last year"
}

export const Delta: FC<{
	value: number | null
	unit: string
	period?: "week" | "month" | "year"
}> = ({ value, unit, period = "month" }) => {
	if (value === null) return null
	const sign = value > 0 ? "+" : ""
	const cls = value > 0 ? "positive" : value < 0 ? "negative" : ""
	const icon =
		value > 0 ? "trending-up" : value < 0 ? "trending-down" : "trending-up-down"
	return (
		<p class={`delta ${cls}`}>
			<span class={`icon-${icon}`} aria-hidden="true"></span> {sign}
			{value.toFixed(1)} {unit} {SUFFIX[period]}
		</p>
	)
}
