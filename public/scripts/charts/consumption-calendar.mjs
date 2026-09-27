import { getColorHex } from "../ui/colors.mjs"

class Consumption {
	#avg
	#min
	#max
	constructor(average, trips) {
		this.#avg = average
		const { min, max } = trips.reduce(
			(acc, t) => {
				if (t.consumption !== null) {
					if (isNaN(acc.min) || t.consumption < acc.min) acc.min = t.consumption
					if (isNaN(acc.max) || t.consumption > acc.max) acc.max = t.consumption
				}
				return acc
			},
			{ min: NaN, max: NaN }
		)
		this.#min = min
		this.#max = max
	}
	get avg() {
		return this.#avg
	}

	get min() {
		return this.#min
	}

	get max() {
		return this.#max
	}
}

const eventClasses = (consumption, trip) => {
	if (!trip.consumption) return ""
	const tone =
		trip.consumption < consumption.avg ? "cal-tone--green" : "cal-tone--amber"
	const bold =
		trip.consumption === consumption.min || trip.consumption === consumption.max
			? " cal-tone--bold"
			: ""
	return `${tone}${bold}`
}

const mapEvents = (trips, avgConsumption) => {
	const consumption = new Consumption(avgConsumption, trips)
	const events = trips.map((t) => ({
		id: t.id,
		title: "",
		start: t.time,
		allDay: true,
		extendedProps: {
			daypart: t.daypart,
			consumption: t.consumption,
			classes: eventClasses(consumption, t)
		}
	}))
	return events
}

const content = (arg) => {
	const { daypart, consumption, classes } = arg.event.extendedProps
	if (consumption === null) return { html: "" }
	const icon = daypart === "morning" ? "icon-clock-8" : "icon-clock-4"
	const formatted = consumption.toFixed(1)
	return {
		html: `<span class="${icon}" aria-hidden="true">&nbsp;</span> <span class="${classes}">${formatted}</span>`
	}
}

const didMount = (info) => {
	const daypart = info.event.extendedProps.daypart
	const bg =
		daypart === "morning" ? getColorHex("amber", 100) : getColorHex("indigo", 100)
	const border =
		daypart === "morning" ? getColorHex("amber", 200) : getColorHex("indigo", 200)
	const element = info.el

	const setStyle = (focused) => {
		element.style.outline = "none"
		element.style.boxShadow = "none"
		if (bg) element.style.backgroundColor = bg
		if (border) {
			element.style.borderColor = border
			element.style.borderWidth = focused ? "2px" : ""
		}
	}
	setStyle(false)
	element.addEventListener("mouseenter", () => setStyle(false))
	element.addEventListener("mouseleave", () => setStyle(false))
	element.addEventListener("focus", () => setStyle(true))
	element.addEventListener("blur", () => setStyle(false))
}

const click = async (info) => {
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

export class ConsumptionCalendar extends FullCalendar.Calendar {
	constructor(element, data) {
		console.log(data)
		const { trips, period, avgConsumption } = data

		const events = mapEvents(trips, avgConsumption)
		console.log(events)
		super(element, {
			headerToolbar: false,
			selectable: false,
			height: "auto",
			weekNumberCalculation: "ISO",
			weekNumbers: true,
			events,
			initialView: period === "week" ? "dayGridWeek" : "dayGridMonth",
			initialDate: events[0]?.start,
			eventContent: content,
			eventDidMount: didMount,
			eventClick: click
		})
	}
}
