import type { Context } from "hono"
import { DateTime } from "luxon"

import { tripsQueries } from "./db/queries/trips"
import { vehiclesQueries } from "./db/queries/vehicles"
import { locationsQueries } from "./db/queries/locations"
import { statsQueries } from "./db/queries/stats"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "./utils/dates"
import { formatDurationHm } from "./utils/format"
import type { Env } from "./utils/logger"

import { tripInputSchema, type TripInputRaw } from "./types"
import {
	validateVehicle,
	validateStartLocation,
	validateEndLocation,
	validateTripConflict,
	validateOdometer
} from "./validators"

import { TripFormPage } from "../frontend/pages/TripFormPage"
import { TripListFragment } from "../frontend/fragments/TripListFragment"
import { StatsSummaryGrid } from "../frontend/fragments/StatsSummaryGrid"

export async function getTripFormPage(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now().setZone(displayTz_)
	const nowDate = now.toFormat("yyyy-MM-dd")
	const nowTime = now.toFormat("HH:mm")

	const defaultDaypart = now.hour < 13 ? "morning" : "afternoon"

	const homeLocation = await locationsQueries.findLocationByLabel("home")
	const workLocation = await locationsQueries.findLocationByLabel("work")

	let startLocationId: string | null = null
	let endLocationId: string | null = null

	if (defaultDaypart === "morning") {
		startLocationId = homeLocation?.id ?? null
		endLocationId = workLocation?.id ?? null
	} else {
		startLocationId = workLocation?.id ?? null
		endLocationId = homeLocation?.id ?? null
	}

	const vehicles = await vehiclesQueries.listAllVehicles()
	const locations = await locationsQueries.listAllLocations()
	const defaultVehicleId = await tripsQueries.findLatestTripVehicleId()

	return c.html(
		<TripFormPage
			nowDate={nowDate}
			nowTime={nowTime}
			defaultDaypart={defaultDaypart}
			startLocationId={startLocationId}
			endLocationId={endLocationId}
			locations={locations.map((l) => ({ id: l.id, label: l.label }))}
			vehicles={vehicles.map((v) => ({ id: v.id, description: v.description }))}
			defaultVehicleId={defaultVehicleId}
		/>
	)
}

export async function getPartialTrips(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz_, now)

	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	const tripsResult = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: trip.start_time.toJSDate(),
		endTime: trip.end_time.toJSDate(),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: trip.start_location,
		endLocation: trip.end_location,
		weatherStart: trip.weatherStart
	}))

	return c.html(<TripListFragment trips={trips} hasTrips={trips.length > 0} />)
}

export async function getPartialStats(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz_, now)
	const { startUtc: prevStartUtc, endUtc: prevEndUtc } = prevMonthBoundsUtc(
		displayTz_,
		now
	)

	const vehicleId = await tripsQueries.findLatestTripVehicleId()

	const currentStats = await statsQueries.periodAggregates({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const prevStats = await statsQueries.periodAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: vehicleId ?? undefined
	})

	return c.html(
		<StatsSummaryGrid
			data={{
				totalDistance: {
					value: currentStats.totalDistance,
					prev: prevStats.totalDistance
				},
				totalTime: {
					value: currentStats.totalDuration,
					prev: prevStats.totalDuration
				},
				totalTimeHm: formatDurationHm(currentStats.totalDuration),
				avgSpeed: { value: currentStats.avgSpeed, prev: prevStats.avgSpeed },
				avgDuration: {
					value: currentStats.avgDuration,
					prev: prevStats.avgDuration
				},
				avgDurationHm: formatDurationHm(currentStats.avgDuration),
				avgConsumption: {
					value: currentStats.avgConsumption,
					prev: prevStats.avgConsumption
				},
				tripCount: { value: currentStats.tripCount, prev: prevStats.tripCount },
				period: "month" as const
			}}
		/>
	)
}

interface FormBody {
	vehicle_id: string
	trip_date: string
	start_time: string
	end_time: string
	daypart: string
	distance_km: string
	avg_speed_kmh?: string
	avg_consumption_kwh_100km?: string
	odometer_km?: string
	start_location_id?: string
	end_location_id?: string
}

function parseFormTripInput(body: FormBody): TripInputRaw {
	const displayTz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
	const startDt = DateTime.fromISO(`${body.trip_date}T${body.start_time}`, {
		zone: displayTz
	})
	const endDt = DateTime.fromISO(`${body.trip_date}T${body.end_time}`, {
		zone: displayTz
	})

	const durationMin = Math.round(endDt.diff(startDt, "minutes").minutes)

	return {
		vehicle_id: body.vehicle_id || "",
		start_time: startDt.toISO() || "",
		end_time: endDt.toISO() || "",
		daypart: (body.daypart as "morning" | "afternoon") || "morning",
		duration_min: durationMin > 0 ? durationMin : 0,
		distance_km: parseFloat(body.distance_km || "0") || 0,
		start_location_id: body.start_location_id || undefined,
		end_location_id: body.end_location_id || undefined,
		avg_speed_kmh: body.avg_speed_kmh ? parseFloat(body.avg_speed_kmh) : undefined,
		avg_consumption_kwh_100km: body.avg_consumption_kwh_100km
			? parseFloat(body.avg_consumption_kwh_100km)
			: undefined,
		odometer_km: body.odometer_km ? parseFloat(body.odometer_km) : undefined
	}
}

export async function htmlCreationHandler(c: Context<Env>) {
	const body = (await c.req.parseBody()) as Record<string, string>
	const input = parseFormTripInput(body as unknown as FormBody)

	const parsed = tripInputSchema.parse(input)
	await validateVehicle(parsed)
	await validateStartLocation(parsed)
	await validateEndLocation(parsed)
	await validateTripConflict(parsed)
	await validateOdometer(parsed)

	await tripsQueries.createTrip(parsed)

	if (c.req.header("HX-Request")) {
		c.header("HX-Redirect", "/")
		return c.text("", 200)
	}

	return c.redirect("/")
}
