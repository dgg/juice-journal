import { Calendar } from "https://cdn.jsdelivr.net/npm/fullcalendar@7.1.0/+esm"

let calendar = null

const destroyCalendar = () => {
	calendar?.destroy()
	calendar = null
}

const renderCalendar = () => {
	destroyCalendar()

	const dataEl = document.getElementById("calendar-data")
	if (!dataEl?.textContent) return

	let data
	try {
		data = JSON.parse(dataEl.textContent)
	} catch {
		return
	}

	if (!data?.trips?.length) return

	const trips = data.trips
	const period = data.period
	const avgConsumption = data.avgConsumption

	if (avgConsumption === null) return

	const consumptionValues = trips
		.map((t) => t.consumption)
		.filter((c) => c !== null)
	if (consumptionValues.length === 0) return

	const minConsumption = Math.min(...consumptionValues)
	const maxConsumption = Math.max(...consumptionValues)

	const computeTone = (consumption) => {
		if (consumption === null) return ""
		const tone = consumption >= maxConsumption ? "red" : consumption < avgConsumption ? "green" : "amber"
		const bold = consumption === minConsumption || consumption === maxConsumption ? " cal-tone--bold" : ""
		return `cal-tone--${tone}${bold}`
	}

	const events = trips.map((t) => ({
		id: t.id,
		title: "",
		start: t.time,
		allDay: true,
		extendedProps: {
			daypart: t.daypart,
			consumption: t.consumption,
			tone: computeTone(t.consumption)
		}
	}))

	const el = document.getElementById("stats-calendar")
	if (!el) return

	calendar = new FullCalendar.Calendar(el, {
		initialView: period === "week" ? "dayGridWeek" : "dayGridMonth",
		headerToolbar: false,
		selectable: false,
		height: "auto",
		events,
		eventContent: (arg) => {
			const { daypart, consumption, tone } = arg.event.extendedProps
			if (consumption === null) return { html: "" }
			const icon = daypart === "morning" ? "icon-clock-8" : "icon-clock-4"
			const formatted = consumption.toFixed(1)
			return {
				html: `<span class="${icon}" aria-hidden="true"></span> <span class="${tone}">${formatted}</span>`
			}
		},
		eventClick: async (info) => {
			info.jsEvent.preventDefault()
			const tripId = info.event.id
			const detailEl = document.getElementById("trip-detail")
			if (!detailEl) return
			try {
				const res = await fetch(`/stats/trips/${tripId}`)
				if (!res.ok) return
				const html = await res.text()
				detailEl.innerHTML = html
			} catch {
				// silently fail
			}
		}
	})

	calendar.render()
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", renderCalendar)
} else {
	renderCalendar()
}

document.body.addEventListener("htmx:afterSettle", (evt) => {
	const swapped = evt.detail?.target
	if (!swapped) return
	if (swapped.id === "stats-region" || swapped.querySelector("#stats-region")) {
		renderCalendar()
	} else if (document.getElementById("calendar-data")) {
		renderCalendar()
	}
})
