import type { FC } from "hono/jsx"
import { raw } from "hono/html"
import { Layout } from "../Layout"
import { StatsChartsFragment } from "../fragments/StatsChartsFragment"
import { StickyCta } from "../components/StickyCta"
import type { StatsView } from "../../backend/stats"

const Scripts = () => (
	<>
		<script
			src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"
			integrity="sha256-SERKgtTty1vsDxll+qzd4Y2cF9swY9BCq62i9wXJ9Uo="
			crossorigin="anonymous" />
		<script src="/static/scripts/stats.mjs" type="module" />
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