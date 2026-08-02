import type { FC } from "hono/jsx"

export const Delta: FC<{ value: number | null; unit: string }> = ({
	value,
	unit
}) => {
	if (value === null) return null
	const sign = value > 0 ? "+" : ""
	const cls = value > 0 ? "positive" : value < 0 ? "negative" : ""
	return (
		<div class={`delta ${cls}`} style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
			{sign}
			{value.toFixed(1)} {unit} vs last month
		</div>
	)
}
