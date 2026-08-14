import { DistanceDurationChart } from "./charts/distance-duration.mjs"
import { SpeedConsumptionChart } from "./charts/speed-consumption.mjs"

let charts = []

const destroyCharts = () => {
	charts.forEach((c) => c?.destroy?.())
	charts = []
}

const renderCharts = () => {
	destroyCharts()

	const dataEl = document.getElementById("stats-data")
	if (!dataEl?.textContent) return

	let data
	try {
		data = JSON.parse(dataEl.textContent)
	} catch {
		return
	}

	if (!data?.labels?.length) return

	const mount = (id, ChartClass) => {
		const el = document.getElementById(id)
		if (!el || typeof Chart === "undefined") return
		charts.push(new ChartClass(el, data))
	}

	mount("chart-distance-duration", DistanceDurationChart)
	mount("chart-speed-consumption", SpeedConsumptionChart)
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", renderCharts)
} else {
	renderCharts()
}

document.body.addEventListener("htmx:afterSettle", (evt) => {
	const swapped = evt.detail?.target
	if (!swapped) return
	if (swapped.id === "stats-region" || swapped.querySelector("#stats-region")) {
		renderCharts()
	} else if (document.getElementById("stats-data")) {
		renderCharts()
	}
})
