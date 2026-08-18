import type { FC } from "hono/jsx"
import { formatNumber } from "../format"
import { Delta } from "./Delta"

interface Stat {
	label: string
	value: number | null
	unit: string
	delta?: number | null
	deltaUnit?: string
	displayValue?: string | null
	icon?: string
	period?: "week" | "month" | "year"
}

export const StatCard: FC<{ stat: Stat; hero?: boolean }> = ({ stat, hero }) => {
	const hasValue = stat.value !== null
	const formatted =
		stat.displayValue ??
		(hasValue ? formatNumber(stat.value, hero ? 1 : 0) : "--")

	return (
		<article
			class={`stat-card${hero ? " stat-card--hero" : ""}`}
			{...(hero && !hasValue ? { "data-empty": "" } : {})}
		>
			<p class="stat-card__value">
				<data value={stat.value ?? ""}>{formatted}</data>{" "}
				<small>{stat.unit}</small>
			</p>
			<small class="stat-card__label">
				{stat.icon && (
					<span class={`icon-${stat.icon}`} aria-hidden="true"></span>
				)}{" "}
				{stat.label}
			</small>
			{stat.delta !== undefined && (
				<Delta
					value={stat.delta}
				/>
			)}
		</article>
	)
}
