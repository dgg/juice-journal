import { getColorHex } from "../ui/colors.mjs"

const SPEED_COLOR = getColorHex("amber", 150)
const CONSUMPTION_COLOR = getColorHex("jade", 500)

const speedDataset = (series) => ({
	label: "Avg speed (km/h)",
	data: series.speed,
	borderColor: SPEED_COLOR,
	backgroundColor: "transparent",
	borderWidth: 2,
	tension: 0.35,
	pointRadius: 3,
	pointHoverRadius: 5,
	yAxisID: "y"
})

const consumptionDataset = (series) => ({
	label: "Avg consumption",
	data: series.consumption,
	borderColor: CONSUMPTION_COLOR,
	backgroundColor: "transparent",
	borderWidth: 2,
	tension: 0.35,
	pointRadius: 3,
	pointHoverRadius: 5,
	yAxisID: "y1"
})

const speedAxis = {
	beginAtZero: true,
	position: "left",
	title: { display: true, text: "km/h" }
}

const consumptionAxis = {
	beginAtZero: true,
	position: "right",
	title: { display: true, text: "kWh/100km" },
	grid: { drawOnChartArea: false }
}

export class SpeedConsumptionChart extends Chart {
	constructor(canvas, data) {
		super(canvas, {
			type: "line",
			data: {
				labels: data.labels,
				datasets: [speedDataset(data), consumptionDataset(data)]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						position: "top",
						labels: {
							boxWidth: 12,
							boxHeight: 12,
							font: { size: 12 }
						}
					},
					tooltip: { mode: "index", intersect: false }
				},
				interaction: { mode: "index", intersect: false },
				scales: {
					x: { grid: { display: false } },
					y: {
						...speedAxis,
						grid: { color: "rgba(127,127,127,0.06)", lineWidth: 1 }
					},
					y1: consumptionAxis
				}
			}
		})
	}
}