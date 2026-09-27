import { DistanceDurationChart } from "./charts/distance-duration.mjs"
import { SpeedConsumptionChart } from "./charts/speed-consumption.mjs"
import { ConsumptionCalendar } from "./charts/consumption-calendar.mjs"

let charts = []

const destroyCharts = () => {
	charts.forEach((c) => c?.destroy?.())
	charts = []
}

const loadData = (dataElementId) => {
	const dataElement = document.getElementById(dataElementId)
	if (!dataElement?.textContent) return

	try {
		return JSON.parse(dataElement.textContent)
	} catch {
		return
	}
}

const mount = (elementId, data, chartClass) => {
	const element = document.getElementById(elementId)
	if (!element || typeof Chart === "undefined" || typeof FullCalendar === "undefined")
		return
	const chart = new chartClass(element, data)
	charts.push(chart)
	return chart
}

const renderCharts = () => {
	destroyCharts()

	const statsData = loadData("stats-data")
	if (statsData?.labels?.length) {
		mount("chart-distance-duration", statsData, DistanceDurationChart)
		mount("chart-speed-consumption", statsData, SpeedConsumptionChart)
	}

	const calendarData = loadData("calendar-data")
	if (calendarData?.trips?.length) {
		const calendar = mount("stats-calendar", calendarData, ConsumptionCalendar)
		calendar.render()
	}
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
