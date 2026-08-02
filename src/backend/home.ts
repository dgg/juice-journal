import { db } from "../db/client"
import {
	resolveDisplayTz,
	currentMonthBoundsUtc,
	prevMonthBoundsUtc
} from "../utils/dates"
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

	// Find displayed vehicle (vehicle of most recent trip)
	const latestTripResult = await db`
		SELECT vehicle_id FROM trips
		ORDER BY end_time DESC
		LIMIT 1
	`

	let vehicleId: string | null = null
	let vehicle = null

	if (latestTripResult.length > 0) {
		vehicleId = latestTripResult[0].vehicle_id
		const vehicleResult = await db`
			SELECT id, description FROM vehicles WHERE id = ${vehicleId}
		`
		if (vehicleResult.length > 0) {
			vehicle = vehicleResult[0]
		}
	}

	// Current month aggregates
	const currentAggResult = vehicleId
		? await db`
			SELECT
				AVG(avg_consumption_kwh_100km) as avg_consumption,
				AVG(duration_min) as avg_duration,
				SUM(distance_km) as total_distance
			FROM trips
			WHERE end_time >= ${startUtc}
				AND end_time < ${endUtc}
				AND vehicle_id = ${vehicleId}
		`
		: await db`
			SELECT
				AVG(avg_consumption_kwh_100km) as avg_consumption,
				AVG(duration_min) as avg_duration,
				SUM(distance_km) as total_distance
			FROM trips
			WHERE end_time >= ${startUtc}
				AND end_time < ${endUtc}
		`

	// Previous month aggregates
	const prevAggResult = vehicleId
		? await db`
			SELECT
				AVG(avg_consumption_kwh_100km) as avg_consumption,
				AVG(duration_min) as avg_duration,
				SUM(distance_km) as total_distance
			FROM trips
			WHERE end_time >= ${prevStartUtc}
				AND end_time < ${prevEndUtc}
				AND vehicle_id = ${vehicleId}
		`
		: await db`
			SELECT
				AVG(avg_consumption_kwh_100km) as avg_consumption,
				AVG(duration_min) as avg_duration,
				SUM(distance_km) as total_distance
			FROM trips
			WHERE end_time >= ${prevStartUtc}
				AND end_time < ${prevEndUtc}
		`

	// Trip list with location joins
	const tripsResult = vehicleId
		? await db`
			SELECT
				t.id,
				t.start_time,
				t.end_time,
				t.daypart,
				t.duration_min,
				t.distance_km,
				t.avg_speed_kmh,
				t.avg_consumption_kwh_100km,
				t.odometer_km,
				start_loc.label as start_location,
				end_loc.label as end_location,
				start_loc.timezone as start_tz,
				end_loc.timezone as end_tz
			FROM trips t
			LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
			LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
			WHERE t.end_time >= ${startUtc}
				AND t.end_time < ${endUtc}
				AND t.vehicle_id = ${vehicleId}
			ORDER BY t.end_time DESC
		`
		: await db`
			SELECT
				t.id,
				t.start_time,
				t.end_time,
				t.daypart,
				t.duration_min,
				t.distance_km,
				t.avg_speed_kmh,
				t.avg_consumption_kwh_100km,
				t.odometer_km,
				start_loc.label as start_location,
				end_loc.label as end_location,
				start_loc.timezone as start_tz,
				end_loc.timezone as end_tz
			FROM trips t
			LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
			LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
			WHERE t.end_time >= ${startUtc}
				AND t.end_time < ${endUtc}
			ORDER BY t.end_time DESC
		`

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: DateTime.fromISO(trip.start_time.toISOString()),
		endTime: DateTime.fromISO(trip.end_time.toISOString()),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: asNumber(trip.distance_km)!,
		avgSpeedKmh: asNumber(trip.avg_speed_kmh),
		avgConsumptionKwh100km: asNumber(trip.avg_consumption_kwh_100km),
		odometerKm: asNumber(trip.odometer_km),
		startLocation: trip.start_location,
		endLocation: trip.end_location
	}))

	const hasTrips = trips.length > 0

	const data: HomeData = {
		vehicle: vehicle ? { id: vehicle.id, description: vehicle.description } : null,
		monthLabel,
		stats: {
			avgConsumption: asNumber(currentAggResult[0]?.avg_consumption),
			avgDuration: asNumber(currentAggResult[0]?.avg_duration),
			totalDistance: asNumber(currentAggResult[0]?.total_distance),
			prevAvgConsumption: asNumber(prevAggResult[0]?.avg_consumption),
			prevAvgDuration: asNumber(prevAggResult[0]?.avg_duration),
			prevTotalDistance: asNumber(prevAggResult[0]?.total_distance)
		},
		trips,
		hasTrips
	}

	return c.html(renderHomePage(data))
}

const asNumber = (dbNumeric: string | null): number | null => typeof dbNumeric === "string" ? parseFloat(dbNumeric) : null



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
	const dateStr = trip.endTime.toFormat("ccc, MMM d")
	const timeStr = `${trip.startTime.toFormat("HH:mm")} – ${trip.endTime.toFormat("HH:mm")}`

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
