import type { FC } from "hono/jsx"

export const EmptyState: FC = () => {
	return (
		<div
			style={{
				textAlign: "center",
				padding: "3rem 1rem",
				color: "var(--pico-muted-color)"
			}}
		>
			<p style={{ fontSize: "1.125rem", margin: 0 }}>
				No trips yet — log your first commute
			</p>
		</div>
	)
}
