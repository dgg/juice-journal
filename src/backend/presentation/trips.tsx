import type { Context } from "hono"
import { DateTime } from "luxon"
import { Hono } from "hono"

import { tripsQueries, type TripWithLocationRow } from "../db/queries/trips"
import { vehiclesQueries } from "../db/queries/vehicles"
import { statsQueries } from "../db/queries/stats"

import { displayTz, currentMonthBoundsUtc, prevMonthBoundsUtc } from "../utils/dates"
import { formatDurationHm } from "../utils/format"
import type { Env } from "../utils/logger"

import { tripInputSchema, type TripInputRaw } from "../types"
import {
	validateVehicle,
	validateTripConflict,
	validateOdometer
} from "../api/validators"

import { TripFormPage } from "../../frontend/pages/TripFormPage"
import { TripListFragment } from "../../frontend/fragments/TripListFragment"
import { StatsSummaryGrid } from "../../frontend/fragments/StatsSummaryGrid"

interface FormBody {
	vehicle_id: string
	trip_date: string
	start_time: string
	end_time: string
	daypart: string
	distance: string
	speed?: string
	consumption?: string
	odometer?: string
	start_location?: string
	end_location?: string
}

function parseFormTripInput(body: FormBody): TripInputRaw {
	const displayTz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
	const startDt = DateTime.fromISO(`${body.trip_date}T${body.start_time}`, {
		zone: displayTz
	})
	const endDt = DateTime.fromISO(`${body.trip_date}T${body.end_time}`, {
		zone: displayTz
	})

	const duration = Math.round(endDt.diff(startDt, "minutes").minutes)

	return {
		vehicle_id: body.vehicle_id || "",
		start_time: startDt.toISO() || "",
		end_time: endDt.toISO() || "",
		daypart: (body.daypart as "morning" | "afternoon") || "morning",
		duration: duration > 0 ? duration : 0,
		distance: parseFloat(body.distance || "0") || 0,
		start_location: (body.start_location as "home" | "work") || undefined,
		end_location: (body.end_location as "home" | "work") || undefined,
		speed: body.speed ? parseFloat(body.speed) : undefined,
		consumption: body.consumption ? parseFloat(body.consumption) : undefined,
		odometer: body.odometer ? parseFloat(body.odometer) : undefined
	}
}

export async function getTripFormPage(c: Context<Env>) {
	const displayTz_ = displayTz()

	const now = DateTime.now().setZone(displayTz_)
	const nowDate = now.toFormat("yyyy-MM-dd")
	const nowTime = now.toFormat("HH:mm")

	const defaultDaypart = now.hour < 13 ? "morning" : "afternoon"

	let startLocation: "home" | "work" | null = null
	let endLocation: "home" | "work" | null = null

	if (defaultDaypart === "morning") {
		startLocation = "home"
		endLocation = "work"
	} else {
		startLocation = "work"
		endLocation = "home"
	}

	const vehicles = await vehiclesQueries.listAllVehicles()
	const defaultVehicleId = await tripsQueries.findLatestTripVehicleId()

	return c.html(
		<TripFormPage
			nowDate={nowDate}
			nowTime={nowTime}
			defaultDaypart={defaultDaypart}
			startLocation={startLocation}
			endLocation={endLocation}
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
	const trips = await tripsQueries.findTripsWithLocations({
		startUtc,
		endUtc,
		vehicleId: vehicleId ?? undefined
	})

	return c.html(<TripListFragment trips={trips} hasTrips={trips.length > 0} />)
}

export async function htmlCreationHandler(c: Context<Env>) {
	const body = (await c.req.parseBody()) as Record<string, string>
	const input = parseFormTripInput(body as unknown as FormBody)

	const parsed = tripInputSchema.parse(input)
	await validateVehicle(parsed)
	await validateTripConflict(parsed)
	await validateOdometer(parsed)

	await tripsQueries.createTrip(parsed)

	if (c.req.header("HX-Request")) {
		c.header("HX-Redirect", "/")
		return c.text("", 200)
	}

	return c.redirect("/")
}

export const tripsDomain = new Hono<Env>()
	.get("/creation", getTripFormPage)
	.post("/", htmlCreationHandler)
	.get("/fragments/list", getPartialTrips)