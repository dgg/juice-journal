import type { FC } from "hono/jsx"

export const Delta: FC<{ value: number | null; unit: string }> = ({ value, unit }) => {
	if (value === null) return null
	const sign = value > 0 ? "+" : ""
	const cls = value > 0 ? "positive" : value < 0 ? "negative" : ""
	return (
		<p class={`delta ${cls}`}>
			{sign}
			{value.toFixed(1)} {unit} vs last month
		</p>
	)
}
