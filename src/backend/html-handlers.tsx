import { tripsQueries } from "../db/queries/trips"
import { vehiclesQueries } from "../db/queries/vehicles"
import { statsQueries } from "../db/queries/stats"
import { resolveDisplayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../utils/dates"
import type { Context } from "hono"
import type { Env } from "../utils/logger"
import { DateTime } from "luxon"
import { tripInputSchema, type TripInput } from "./types"
import {
	validateVehicle,
	validateStartLocation,
	validateEndLocation,
	validateTripConflict
} from "./validators"
import { TripFormPage } from "../frontend/pages/TripFormPage"
import { TripListFragment } from "../frontend/fragments/TripListFragment"
import { StatsFragment } from "../frontend/fragments/StatsFragment"
import { TripCreatedResponse } from "../frontend/fragments/TripCreatedResponse"

export async function getTripFormPage(c: Context<Env>) {
	return c.html(<TripFormPage />)
}

export async function getPartialTrips(c: Context<Env>) {
	const displayTz = resolveDisplayTz(
		undefined,
		undefined,
		process.env.DISPLAY_TZ || "Europe/Copenhagen"
	)

	const now = DateTime.now()
	const { startUtc, endUtc } = currentMonthBoundsUtc(displayTz, now)

	const vehicleId = await tripsQueries.findLatestTripVehicleId()
	const tripsResult = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const trips = tripsResult.map((trip) => ({
		id: trip.id,
		startTime: new Date(trip.start_time.toISO() as string),
		endTime: new Date(trip.end_time.toISO() as string),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: trip.start_location,
		endLocation: trip.end_location
	}))

	return c.html(<TripListFragment trips={trips} hasTrips={trips.length > 0} />)
}

export async function getPartialStats(c: Context<Env>) {
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

	const vehicleId = await tripsQueries.findLatestTripVehicleId()

	const currentStats = await statsQueries.monthlyAggregates({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	const prevStats = await statsQueries.monthlyAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: vehicleId ?? undefined
	})

	return c.html(
		<StatsFragment
			stats={{
				avgConsumption: currentStats.avgConsumption,
				avgDuration: currentStats.avgDuration,
				totalDistance: currentStats.totalDistance,
				prevAvgConsumption: prevStats.avgConsumption,
				prevAvgDuration: prevStats.avgDuration,
				prevTotalDistance: prevStats.totalDistance
			}}
		/>
	)
}

function parseFormTripInput(body: Record<string, string>): TripInput {
	return {
		vehicle_id: body.vehicle_id || "",
		start_time: body.start_time || "",
		end_time: body.end_time || "",
		daypart: (body.daypart as "morning" | "afternoon") || "morning",
		duration_min: parseInt(body.duration_min || "0", 10) || 0,
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
	const body = await c.req.parseBody() as Record<string, string>
	const input = parseFormTripInput(body)

	const parsed = tripInputSchema.parse(input)
	await validateVehicle(parsed)
	await validateStartLocation(parsed)
	await validateEndLocation(parsed)
	await validateTripConflict(parsed)

	const trip = await tripsQueries.createTrip(parsed)

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

	const currentStats = await statsQueries.monthlyAggregates({
		startUtc,
		endUtc,
		vehicleId: trip.vehicle_id
	})
	const prevStats = await statsQueries.monthlyAggregates({
		startUtc: prevStartUtc,
		endUtc: prevEndUtc,
		vehicleId: trip.vehicle_id
	})

	const tripRow = {
		id: trip.id,
		startTime: new Date(trip.start_time.toISO() as string),
		endTime: new Date(trip.end_time.toISO() as string),
		daypart: trip.daypart,
		durationMin: trip.duration_min,
		distanceKm: trip.distance_km,
		avgSpeedKmh: trip.avg_speed_kmh,
		avgConsumptionKwh100km: trip.avg_consumption_kwh_100km,
		odometerKm: trip.odometer_km,
		startLocation: null,
		endLocation: null
	}

	return c.html(
		<TripCreatedResponse
			trip={tripRow}
			stats={{
				avgConsumption: currentStats.avgConsumption,
				avgDuration: currentStats.avgDuration,
				totalDistance: currentStats.totalDistance,
				prevAvgConsumption: prevStats.avgConsumption,
				prevAvgDuration: prevStats.avgDuration,
				prevTotalDistance: prevStats.totalDistance
			}}
		/>
	)
}
