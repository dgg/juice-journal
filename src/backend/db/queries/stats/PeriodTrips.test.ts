import { sql } from "bun"
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { TripDetail } from "../trips/trips"
import type { VehicleRow } from "../vehicles/VehicleRow"

import { PeriodTrips } from "./PeriodTrips"

type Trip = Pick<
	TripDetail,
	"consumption" | "distance" | "duration" | "speed" | "daypart"
> & {
	start_time: string
	end_time: string
}

const seedTrip = async (trip: Trip): Promise<void> => {
	const row = {
		...trip,
		vehicle_id: VEHICLE_ID,
		start_location: "home",
		end_location: "work"
	}
	await DbInstance.client`INSERT INTO trips ${sql(row)}`
}

const VEHICLE_ID = "vhcl_PeriodTrips"

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

describe(PeriodTrips.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "PeriodTrips"
		})
		await Promise.all([
			seedTrip({
				start_time: "2026-06-01T08:00:00Z",
				end_time: "2026-06-01T08:45:00Z",
				daypart: "morning",
				duration: 45,
				distance: 15,
				speed: 20,
				consumption: 14
			}),
			seedTrip({
				start_time: "2026-06-01T15:00:00Z",
				end_time: "2026-06-01T15:30:00Z",
				daypart: "afternoon",
				duration: 30,
				distance: 10.0,
				speed: 40.0,
				consumption: 21.0
			}),
			seedTrip({
				start_time: "2026-06-15T08:00:00Z",
				end_time: "2026-06-15T08:36:00Z",
				daypart: "morning",
				duration: 36,
				distance: 14,
				speed: 36,
				consumption: 27
			})
		])
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	describe("no aggregation", () => {
		it("all rows from period", async () => {
			const start = DateTime.fromISO("2026-06-01T00:00:00Z", { setZone: true })
			const end = DateTime.fromISO("2026-06-01T20:00:00Z", { setZone: true })
			const stats = await new PeriodTrips(VEHICLE_ID, start, end).execute(
				DbInstance.client
			)

			expect(stats).toHaveLength(2) // trips outside period are not returned
			// early trip
			expect(stats[0]).toEqual({
				duration: 45,
				distance: 15,
				speed: 20,
				consumption: 14,
				daypart: "morning",
				time: DateTime.fromISO("2026-06-01T08:45:00Z", { setZone: true })
			})
			// late trip
			expect(stats[1]).toEqual({
				duration: 30,
				distance: 10.0,
				speed: 40.0,
				consumption: 21.0,
				daypart: "afternoon",
				time: DateTime.fromISO("2026-06-01T15:30:00Z", { setZone: true })
			})
		})
	})
})
