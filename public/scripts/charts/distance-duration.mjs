import { getColorHex } from "../ui/colors.mjs"

const barGradient = (topColor, bottomColor) => (ctx) => {
	if (!ctx.chart.chartArea) return topColor
	const { top, bottom } = ctx.chart.chartArea
	const gradient = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom)
	gradient.addColorStop(0, topColor)
	gradient.addColorStop(1, bottomColor)
	return gradient
}

const DISTANCE_BORDER_COLOR = getColorHex("slate", 400)

const distanceDataset = (series) => ({
	label: "Distance (km)",
	data: series.distance,
	backgroundColor: barGradient(getColorHex("slate", 300), getColorHex("slate", 500)),
	borderColor: DISTANCE_BORDER_COLOR,
	borderWidth: 1,
	borderRadius: 6,
	borderSkipped: false,
	yAxisID: "y"
})

const DURATION_BORDER_COLOR = getColorHex("pink", 300)

const durationDataset = (series) => ({
	label: "Duration (min)",
	data: series.duration,
	backgroundColor: barGradient(getColorHex("pink", 200), getColorHex("pink", 400)),
	borderColor: DURATION_BORDER_COLOR,
	borderWidth: 1,
	borderRadius: 6,
	borderSkipped: false,
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
				animations: {
					colors: { duration: 200 },
					y: { duration: 200 }
				},
				scales: {
					x: { grid: { display: false } },
					y: {
						...distanceAxis,
						grid: { color: "rgba(127,127,127,0.06)", lineWidth: 1 }
					},
					y1: durationAxis
				}
			}
		})
	}
}