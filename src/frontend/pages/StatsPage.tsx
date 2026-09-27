import type { FC } from "hono/jsx"

import { Layout } from "../Layout"
import { StatsChartsFragment } from "../fragments/StatsChartsFragment"
import { StickyCta } from "../components/StickyCta"

import type { StatsView } from "../../backend/presentation/stats/types"

const Scripts = () => (
	<>
		<script
			src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"
			integrity="sha256-SERKgtTty1vsDxll+qzd4Y2cF9swY9BCq62i9wXJ9Uo="
			crossorigin="anonymous"
		/>
		<script src="https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/all/global.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/themes/breezy/global.js"></script>
		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/skeleton.css"
			crossorigin="anonymous"
		/>
		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/themes/breezy/theme.css"
			crossorigin="anonymous"
		/>
		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/themes/breezy/palettes/indigo.css"
			crossorigin="anonymous"
		/>

		<script src="/static/scripts/stats.mjs" type="module" />
		<script src="/static/scripts/calendar.mjs" type="module" />
	</>
)

export const StatsPage: FC<{ data: StatsView }> = ({ data }) => {
	return (
		<Layout title="Stats — Juice Journal">
			<main class="container">
				<StatsChartsFragment data={data} />
				<StickyCta actions={[{ href: "/", label: "Back", icon: "home" }]} />
			</main>
			<Scripts />
		</Layout>
	)
}
