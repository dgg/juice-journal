import { DateTime } from "luxon"
import { Hono } from "hono"

import type { Context } from "hono"
import { tripsQueries } from "../db/queries/trips"
import { vehiclesQueries } from "../db/queries/vehicles"

import { displayTz, currentMonthBoundsUtc } from "../utils/dates"
import type { Env } from "../utils/logger"

import { tripFormSchema, type TripInput, type Daypart } from "../types"
import { validateTripFormConsistency, zodIssuesToFieldMap } from "./formValidators"

import { TripFormPage } from "../../frontend/pages/TripFormPage"
import { TripFormFragment } from "../../frontend/fragments/TripFormFragment"
import { TripListFragment } from "../../frontend/fragments/TripListFragment"

async function buildTripFormProps(
	c: Context<Env>,
	opts?: { errors?: Record<string, string>; submitted?: Record<string, string> }
) {
	const tz = displayTz()
	const now = DateTime.now().setZone(tz)
	const nowDate = now.toFormat("yyyy-MM-dd")
	const nowTime = now.toFormat("HH:mm")
	const defaultDaypart: Daypart = now.hour < 13 ? "morning" : "afternoon"
	const [startLocation, endLocation] =
		defaultDaypart === "morning"
			? ["home" as const, "work" as const]
			: ["work" as const, "home" as const]
	const vehicles = await vehiclesQueries.listAllVehicles()
	const defaultVehicleId = await tripsQueries.findLatestTripVehicleId()

	return {
		nowDate,
		nowTime,
		defaultDaypart,
		startLocation,
		endLocation,
		vehicles: vehicles.map((v) => ({ id: v.id, description: v.description })),
		defaultVehicleId,
		errors: opts?.errors,
		submitted: opts?.submitted
	}
}

export async function getTripFormPage(c: Context<Env>) {
	return c.html(<TripFormPage {...await buildTripFormProps(c)} />)
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

async function schemaMiddleware(c: Context<Env>, next: () => Promise<void>) {
	const body = (await c.req.parseBody()) as Record<string, string>
	const result = tripFormSchema.safeParse(body)
	if (!result.success) {
		console.log(result.error.issues)
		return c.html(
			<TripFormFragment
				{...await buildTripFormProps(c, {
					submitted: body,
					errors: zodIssuesToFieldMap(result.error.issues)
				})}
			/>,
			200
		)
	}
	c.set("tripInput", result.data)
	await next()
}

async function consistencyMiddleware(c: Context<Env>, next: () => Promise<void>) {
	const input: TripInput = c.get("tripInput")
	const error = await validateTripFormConsistency(input)
	if (error.issues.length > 0) {
		const body = (await c.req.parseBody()) as Record<string, string>
		return c.html(
			<TripFormFragment
				{...await buildTripFormProps(c, {
					submitted: body,

					errors: zodIssuesToFieldMap(error.issues)
				})}
			/>,
			200
		)
	}
	await next()
}

export async function htmlCreationHandler(c: Context<Env>) {
	const input: TripInput = c.get("tripInput")
	await tripsQueries.createTrip(input)
	if (c.req.header("HX-Request")) {
		c.header("HX-Redirect", "/")
		return c.text("", 200)
	}
	return c.redirect("/")
}

export const tripsDomain = new Hono<Env>()
	.get("/creation", getTripFormPage)
	.post("/", schemaMiddleware, consistencyMiddleware, htmlCreationHandler)
	.get("/fragments/list", getPartialTrips)
