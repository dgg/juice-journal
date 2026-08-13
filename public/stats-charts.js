;(function () {
	var charts = []

	function destroyCharts() {
		charts.forEach(function (c) {
			if (c && typeof c.destroy === "function") c.destroy()
		})
		charts = []
	}

	function renderCharts() {
		destroyCharts()

		var dataEl = document.getElementById("stats-data")
		if (!dataEl || !dataEl.textContent) return

		var data
		try {
			data = JSON.parse(dataEl.textContent)
		} catch (e) {
			return
		}

		if (!data || !data.labels || data.labels.length === 0) return

		var chartOptions = {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: { position: "top" },
				tooltip: { mode: "index", intersect: false }
			},
			interaction: { mode: "index", intersect: false },
			scales: {
				x: { grid: { display: false } }
			}
		}

		var ctx1 = document.getElementById("chart-distance-duration")
		if (ctx1 && typeof Chart !== "undefined") {
			charts.push(
				new Chart(ctx1, {
					type: "bar",
					data: {
						labels: data.labels,
						datasets: [
							{
								label: "Distance (km)",
								data: data.distance,
								backgroundColor: "rgba(54, 162, 235, 0.6)",
								borderColor: "rgba(54, 162, 235, 1)",
								borderWidth: 1,
								yAxisID: "y"
							},
							{
								label: "Duration (min)",
								data: data.duration,
								backgroundColor: "rgba(255, 159, 64, 0.6)",
								borderColor: "rgba(255, 159, 64, 1)",
								borderWidth: 1,
								yAxisID: "y1"
							}
						]
					},
					options: Object.assign({}, chartOptions, {
						scales: Object.assign({}, chartOptions.scales, {
							y: {
								beginAtZero: true,
								position: "left",
								title: { display: true, text: "km" }
							},
							y1: {
								beginAtZero: true,
								position: "right",
								title: { display: true, text: "min" },
								grid: { drawOnChartArea: false }
							}
						})
					})
				})
			)
		}

		var ctx2 = document.getElementById("chart-speed-consumption")
		if (ctx2 && typeof Chart !== "undefined") {
			charts.push(
				new Chart(ctx2, {
					type: "bar",
					data: {
						labels: data.labels,
						datasets: [
							{
								label: "Avg speed (km/h)",
								data: data.speed,
								backgroundColor: "rgba(75, 192, 192, 0.6)",
								borderColor: "rgba(75, 192, 192, 1)",
								borderWidth: 1,
								yAxisID: "y"
							},
							{
								label: "Avg consumption (kWh/100km)",
								data: data.consumption,
								backgroundColor: "rgba(153, 102, 255, 0.6)",
								borderColor: "rgba(153, 102, 255, 1)",
								borderWidth: 1,
								yAxisID: "y1"
							}
						]
					},
					options: Object.assign({}, chartOptions, {
						scales: Object.assign({}, chartOptions.scales, {
							y: {
								beginAtZero: true,
								position: "left",
								title: { display: true, text: "km/h" }
							},
							y1: {
								beginAtZero: true,
								position: "right",
								title: { display: true, text: "kWh/100km" },
								grid: { drawOnChartArea: false }
							}
						})
					})
				})
			)
		}
	}

	// Initial render on full page load
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", renderCharts)
	} else {
		renderCharts()
	}

	// Re-render after every HTMX swap (period switcher / year toggle).
	// The home page has no #stats-data, so renderCharts() no-ops there.
	document.body.addEventListener("htmx:afterSettle", function (evt) {
		var swapped = evt.detail && evt.detail.target
		if (!swapped) return
		if (swapped.id === "stats-region" || swapped.querySelector("#stats-region")) {
			renderCharts()
		} else if (document.getElementById("stats-data")) {
			// Fallback: if stats-data exists anywhere after settle, render.
			renderCharts()
		}
	})
})()
