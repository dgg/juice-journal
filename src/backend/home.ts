import {
	resolveDisplayTz,
	currentMonthBoundsUtc,
	prevMonthBoundsUtc
} from "../utils/dates"
import { tripsQueries } from "../db/queries/trips"
import { vehiclesQueries } from "../db/queries/vehicles"
import { statsQueries } from "../db/queries/stats"
import type { Context } from "hono"
import type { Env } from "../utils/logger"
import { DateTime } from "luxon"

interface HomeData {
	vehicle: {
		id: string
		description: string
	} | null
	monthLabel: string
	stats: {
		avgConsumption: number | null
		avgDuration: number | null
		totalDistance: number | null
		prevAvgConsumption: number | null
		prevAvgDuration: number | null
		prevTotalDistance: number | null
	}
	trips: Array<{
		id: string
		startTime: DateTime
		endTime: DateTime
		daypart: string
		durationMin: number
		distanceKm: number
		avgSpeedKmh: number | null
		avgConsumptionKwh100km: number | null
		odometerKm: number | null
		startLocation: string | null
		endLocation: string | null
	}>
	hasTrips: boolean
}

export async function homeHandler(c: Context<Env>) {
	const displayTz = resolveDisplayTz(
		undefined,
		undefined,
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz, now)
	const { startUtc: prevStartUtc, endUtc: prevEndUtc } = prevMonthBoundsUtc(
		displayTz,
		now
	)

	const monthLabel = now.setZone(displayTz).toFormat("MMMM yyyy")

	// TODO: merge into a single query
	// Find displayed vehicle (vehicle of most recent trip)
	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	let vehicle = null

	if (vehicleId) {
		vehicle = await vehiclesQueries.findVehicleById(vehicleId)
	}

	// Current month aggregates
	const currentStats = await statsQueries.monthlyAggregates({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	// Previous month aggregates
	const prevStats = await statsQueries.monthlyAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: vehicleId ?? undefined
	})

	// Trip list with location joins
	const tripsResult = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: trip.start_time,
		endTime: trip.end_time,
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: trip.start_location,
		endLocation: trip.end_location
	}))

	const hasTrips = trips.length > 0

	const data: HomeData = {
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		monthLabel,
		stats: {
			avgConsumption: currentStats.avgConsumption,
			avgDuration: currentStats.avgDuration,
			totalDistance: currentStats.totalDistance,
			prevAvgConsumption: prevStats.avgConsumption,
			prevAvgDuration: prevStats.avgDuration,
			prevTotalDistance: prevStats.totalDistance
		},
		trips,
		hasTrips
	}

	return c.html(renderHomePage(data))
}

function renderHomePage(data: HomeData): string {
	const { vehicle, monthLabel, stats, trips, hasTrips } = data

	const vehicleBadge = vehicle
		? `<span class="vehicle-badge">${escapeHtml(vehicle.description)}</span>`
		: ""

	const consumptionDelta =
		stats.avgConsumption !== null && stats.prevAvgConsumption !== null
			? stats.avgConsumption - stats.prevAvgConsumption
			: null

	const durationDelta =
		stats.avgDuration !== null && stats.prevAvgDuration !== null
			? stats.avgDuration - stats.prevAvgDuration
			: null

	const heroStat =
		stats.avgConsumption !== null
			? `<div class="hero-stat">
			<div class="stat-value">${formatNumber(stats.avgConsumption, 1)} <small>kWh/100km</small></div>
			<div class="stat-label">Avg consumption</div>
			${consumptionDelta !== null ? renderDelta(consumptionDelta, "kWh/100km") : ""}
		</div>`
			: `<div class="hero-stat empty">
			<div class="stat-value">--</div>
			<div class="stat-label">Avg consumption</div>
		</div>`

	const secondaryStats = `
		<div class="secondary-stat">
			<div class="stat-value">${stats.avgDuration !== null ? formatNumber(stats.avgDuration, 0) : "--"} <small>min</small></div>
			<div class="stat-label">Avg duration</div>
			${durationDelta !== null ? renderDelta(durationDelta, "min") : ""}
		</div>
		<div class="secondary-stat">
			<div class="stat-value">${stats.totalDistance !== null ? formatNumber(stats.totalDistance, 1) : "--"} <small>km</small></div>
			<div class="stat-label">Total distance</div>
		</div>
	`

	const tripList = hasTrips
		? trips.map((trip) => renderTripRow(trip)).join("")
		: `<div class="empty-state">
			<p>No trips yet — log your first commute</p>
		</div>`

	return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Juice Journal</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<style>
		:root {
			--daypart-morning: #f59e0b;
			--daypart-afternoon: #6366f1;
		}
		.container { max-width: 800px; }
		.sticky-cta {
			position: sticky;
			bottom: 0;
			background: var(--pico-background-color);
			padding: 1rem 0;
			border-top: 1px solid var(--pico-muted-border-color);
			z-index: 10;
		}
		.sticky-cta button {
			width: 100%;
			font-size: 1.1rem;
			padding: 0.75rem;
		}
		.header-bar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 1rem;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.month-title { font-size: 1.5rem; font-weight: 600; margin: 0; }
		.vehicle-badge {
			background: var(--pico-primary-background);
			color: var(--pico-primary-inverse);
			padding: 0.25rem 0.75rem;
			border-radius: 9999px;
			font-size: 0.875rem;
		}
		.stats-grid {
			display: grid;
			grid-template-columns: 1fr;
			gap: 1rem;
			margin-bottom: 1.5rem;
		}
		@media (min-width: 768px) {
			.stats-grid { grid-template-columns: 1fr 1fr; }
		}
		.hero-stat {
			background: var(--pico-card-background-color);
			padding: 1.5rem;
			border-radius: var(--pico-border-radius);
			text-align: center;
		}
		.hero-stat .stat-value {
			font-size: 2rem;
			font-weight: 700;
			color: var(--pico-primary);
		}
		.hero-stat .stat-value small { font-size: 1rem; font-weight: 400; }
		.hero-stat .stat-label {
			font-size: 0.875rem;
			color: var(--pico-muted-color);
			margin-top: 0.25rem;
		}
		.hero-stat.empty .stat-value { color: var(--pico-muted-color); }
		.secondary-stats {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}
		.secondary-stat {
			background: var(--pico-card-background-color);
			padding: 1rem;
			border-radius: var(--pico-border-radius);
			text-align: center;
		}
		.secondary-stat .stat-value {
			font-size: 1.25rem;
			font-weight: 600;
		}
		.secondary-stat .stat-value small { font-size: 0.875rem; font-weight: 400; }
		.secondary-stat .stat-label {
			font-size: 0.75rem;
			color: var(--pico-muted-color);
		}
		.delta {
			font-size: 0.875rem;
			margin-top: 0.25rem;
		}
		.delta.positive { color: var(--pico-color-red-500); }
		.delta.negative { color: var(--pico-color-green-500); }
		.trip-list { margin-bottom: 6rem; }
		details.trip-row {
			background: var(--pico-card-background-color);
			border-radius: var(--pico-border-radius);
			margin-bottom: 0.5rem;
			overflow: hidden;
		}
		details.trip-row summary {
			padding: 1rem;
			display: flex;
			align-items: center;
			gap: 0.75rem;
			cursor: pointer;
			list-style: none;
		}
		details.trip-row summary::-webkit-details-marker { display: none; }
		.daypart-indicator {
			width: 2rem;
			height: 2rem;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1rem;
			flex-shrink: 0;
		}
		.daypart-indicator.morning { background: #fef3c7; color: var(--daypart-morning); }
		.daypart-indicator.afternoon { background: #e0e7ff; color: var(--daypart-afternoon); }
		.trip-meta { flex: 1; min-width: 0; }
		.trip-date { font-weight: 600; font-size: 0.9375rem; }
		.trip-time { font-size: 0.875rem; color: var(--pico-muted-color); }
		.trip-consumption {
			font-weight: 600;
			color: var(--pico-primary);
			white-space: nowrap;
		}
		.trip-details {
			padding: 0 1rem 1rem 1rem;
			border-top: 1px solid var(--pico-muted-border-color);
		}
		.trip-details dl {
			display: grid;
			grid-template-columns: auto 1fr;
			gap: 0.25rem 1rem;
			margin: 0.75rem 0 0 0;
		}
		.trip-details dt { color: var(--pico-muted-color); font-size: 0.875rem; }
		.trip-details dd { margin: 0; font-weight: 500; }
		.empty-state {
			text-align: center;
			padding: 3rem 1rem;
			color: var(--pico-muted-color);
		}
		.empty-state p { font-size: 1.125rem; margin: 0; }
	</style>
</head>
<body>
	<main class="container">
		<div class="header-bar">
			<h1 class="month-title">${escapeHtml(monthLabel)}</h1>
			${vehicleBadge}
		</div>

		<div class="stats-grid">
			${heroStat}
			<div class="secondary-stats">
				${secondaryStats}
			</div>
		</div>

		<section class="trip-list" aria-label="Trip list">
			<h2>Trips</h2>
			${tripList}
		</section>

		<div class="sticky-cta">
			<button class="contrast">Log new trip</button>
		</div>
	</main>
</body>
</html>`
}

function renderTripRow(trip: HomeData["trips"][0]): string {
	const dateStr = trip.endTime
		.setZone(process.env.DISPLAY_TZ || "Europe/Copenhagen")
		.toFormat("ccc, MMM d")
	const timeStr = `${trip.startTime.setZone(process.env.DISPLAY_TZ || "Europe/Copenhagen").toFormat("HH:mm")} – ${trip.endTime.setZone(process.env.DISPLAY_TZ || "Europe/Copenhagen").toFormat("HH:mm")}`

	const daypartClass = trip.daypart === "morning" ? "morning" : "afternoon"
	const daypartIcon = trip.daypart === "morning" ? "☀" : "🌙"

	const consumptionStr =
		trip.avgConsumptionKwh100km !== null
			? `${formatNumber(trip.avgConsumptionKwh100km, 1)} kWh/100km`
			: "--"

	return `<details class="trip-row">
		<summary>
			<div class="daypart-indicator ${daypartClass}">${daypartIcon}</div>
			<div class="trip-meta">
				<div class="trip-date">${escapeHtml(dateStr)}</div>
				<div class="trip-time">${escapeHtml(timeStr)}</div>
			</div>
			<div class="trip-consumption">${escapeHtml(consumptionStr)}</div>
		</summary>
		<div class="trip-details">
			<dl>
				<dt>Distance</dt>
				<dd>${formatNumber(trip.distanceKm, 1)} km</dd>
				<dt>Duration</dt>
				<dd>${trip.durationMin} min</dd>
				<dt>Avg speed</dt>
				<dd>${trip.avgSpeedKmh !== null ? formatNumber(trip.avgSpeedKmh, 0) : "--"} km/h</dd>
				${trip.odometerKm !== null ? `<dt>Odometer</dt><dd>${formatNumber(trip.odometerKm, 1)} km</dd>` : ""}
				${trip.startLocation ? `<dt>From</dt><dd>${escapeHtml(trip.startLocation)}</dd>` : ""}
				${trip.endLocation ? `<dt>To</dt><dd>${escapeHtml(trip.endLocation)}</dd>` : ""}
			</dl>
		</div>
	</details>`
}

function renderDelta(delta: number, unit: string): string {
	const sign = delta > 0 ? "+" : ""
	const cls = delta > 0 ? "positive" : delta < 0 ? "negative" : ""
	return `<div class="delta ${cls}">${sign}${formatNumber(delta, 1)} ${unit} vs last month</div>`
}

function formatNumber(value: number, decimals: number): string {
	return value.toFixed(decimals)
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
}
