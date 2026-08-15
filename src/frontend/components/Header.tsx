import type { FC } from "hono/jsx"

export const Header: FC<{ month: string; vehicle: string | null }> = ({
	month,
	vehicle
}) => {
	return (
		<header class="page-header">
			<h1>{month}</h1>
			{vehicle && (
				<small class="badge">
					<span class="icon-car-front" aria-hidden="true"></span> {vehicle}
				</small>
			)}
		</header>
	)
}
