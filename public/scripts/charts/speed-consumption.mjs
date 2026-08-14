import { getColorHex, getColorRgba } from "../ui/colors.mjs"

const SPEED_BG_COLOR = getColorRgba("cyan", 450, .6)
const SPEED_BORDER_COLOR = getColorHex("cyan", 350)

const speedDataset = (series) => ({
	label: "Avg speed (km/h)",
	data: series.speed,
	backgroundColor: SPEED_BG_COLOR,
	borderColor: SPEED_BORDER_COLOR,
	borderWidth: 1,
	yAxisID: "y"
})

const CONSUMPTION_BG_COLOR = getColorRgba("purple", 450, .6)
const CONSUMPTION_BORDER_COLOR = getColorHex("purple", 350)

const consumptionDataset = (series) => ({
	label: "Avg consumption (kWh/100km)",
	data: series.consumption,
	backgroundColor: CONSUMPTION_BG_COLOR,
	borderColor: CONSUMPTION_BORDER_COLOR,
	borderWidth: 1,
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
			type: "bar",
			data: {
				labels: data.labels,
				datasets: [speedDataset(data), consumptionDataset(data)]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: { position: "top" },
					tooltip: { mode: "index", intersect: false }
				},
				interaction: { mode: "index", intersect: false },
				scales: {
					x: { grid: { display: false } },
					y: speedAxis,
					y1: consumptionAxis
				}
			}
		})
	}
}
