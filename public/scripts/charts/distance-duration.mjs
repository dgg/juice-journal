import { getColorHex, getColorRgba } from "../ui/colors.mjs"

const DISTANCE_BG_COLOR = getColorRgba("azure", 450, 0.6)
const DISTANCE_BORDER_COLOR = getColorHex("azure", 350)

const distanceDataset = (series) => ({
	label: "Distance (km)",
	data: series.distance,
	backgroundColor: DISTANCE_BG_COLOR,
	borderColor: DISTANCE_BORDER_COLOR,
	borderWidth: 1,
	yAxisID: "y"
})

const DURATION_BG_COLOR = getColorRgba("amber", 200, 0.6)
const DURATION_BORDER_COLOR = getColorHex("amber", 100)

const durationDataset = (series) => ({
	label: "Duration (min)",
	data: series.duration,
	backgroundColor: DURATION_BG_COLOR,
	borderColor: DURATION_BORDER_COLOR,
	borderWidth: 1,
	yAxisID: "y1"
})

const distanceAxis = {
	beginAtZero: true,
	position: "left",
	title: { display: true, text: "km" }
}

const durationAxis = {
	beginAtZero: true,
	position: "right",
	title: { display: true, text: "min" },
	grid: { drawOnChartArea: false }
}

export class DistanceDurationChart extends Chart {
	constructor(canvas, data) {
		super(canvas, {
			type: "bar",
			data: {
				labels: data.labels,
				datasets: [distanceDataset(data), durationDataset(data)]
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
					y: distanceAxis,
					y1: durationAxis
				}
			}
		})
	}
}
