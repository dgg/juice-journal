;(function () {
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

	// Chart 1: Distance (left) + Duration (right)
	var ctx1 = document.getElementById("chart-distance-duration")
	if (ctx1) {
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
	}

	// Chart 2: Avg Speed (left) + Avg Consumption (right)
	var ctx2 = document.getElementById("chart-speed-consumption")
	if (ctx2) {
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
	}
})()
