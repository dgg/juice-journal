import type { FC } from "hono/jsx"

export const Header: FC<{ month: string; vehicle: string | null }> = ({
	month,
	vehicle
}) => {
	return (
		<header
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "1rem",
				flexWrap: "wrap",
				gap: "0.5rem"
			}}
		>
			<h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
				{month}
			</h1>
			{vehicle && (
				<span
					style={{
						background: "var(--pico-primary-background)",
						color: "var(--pico-primary-inverse)",
						padding: "0.25rem 0.75rem",
						borderRadius: "9999px",
						fontSize: "0.875rem"
					}}
				>
					{vehicle}
				</span>
			)}
		</header>
	)
}
