import { sql } from "bun"
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { TripDetail } from "../trips/trips"
import type { VehicleRow } from "../vehicles/VehicleRow"

import { NULL_STATS as NO_STATS, PeriodAggregates } from "./PeriodAggregates"

type Trip = Pick<TripDetail, "consumption" | "distance" | "duration" | "speed"> & {
	start_time: string
	end_time: string
}

const seedTrip = async (trip: Trip): Promise<void> => {
	const row = {
		...trip,
		daypart: "morning", // do not matter if accurate
		vehicle_id: VEHICLE_ID,
		start_location: "home",
		end_location: "work"
	}
	await DbInstance.client`INSERT INTO trips ${sql(row)}`
}

const VEHICLE_ID = "vhcl_PeriodAggregates"

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

describe(PeriodAggregates.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "PeriodAggregates"
		})
		await Promise.all([
			seedTrip({
				start_time: "2026-04-01T08:00:00Z",
				end_time: "2026-04-01T08:45:00Z",
				duration: 45,
				distance: 15,
				speed: 20,
				consumption: 14
			}),
			seedTrip({
				start_time: "2026-04-01T15:00:00Z",
				end_time: "2026-04-01T15:30:00Z",
				duration: 30,
				distance: 10.0,
				speed: 40.0,
				consumption: 21.0
			}),
			seedTrip({
				start_time: "2026-03-15T09:00:00Z",
				end_time: "2026-03-15T09:36:00Z",
				duration: 36,
				distance: 14,
				speed: null,
				consumption: null
			}),
			seedTrip({
				start_time: "2026-03-15T16:00:00Z",
				end_time: "2026-03-15T16:37:00Z",
				duration: 37,
				distance: 14,
				speed: 30,
				consumption: null
			})
		])
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	describe("no data", () => {
		it("no stats", async () => {
			const start = DateTime.fromISO("2024-01-01T00:00:00Z", {
				setZone: true
			})
			const end = DateTime.fromISO("2024-12-31T23:59:59Z", {
				setZone: true
			})
			const stats = await new PeriodAggregates(VEHICLE_ID, start, end).execute(
				DbInstance.client
			)

			expect(stats).toEqual(NO_STATS)
		})
	})

	describe("missing data", () => {
		it("missing data aggregated", async () => {
			const start = DateTime.fromISO("2026-03-01T00:00:00Z", {
				setZone: true
			})
			const end = DateTime.fromISO("2026-03-31T23:59:59Z", {
				setZone: true
			})
			const stats = await new PeriodAggregates(VEHICLE_ID, start, end).execute(
				DbInstance.client
			)

			expect(stats.avgSpeed).toEqual(30)
			expect(stats.avgConsumption).toBeNull()
		})
	})

	describe("complete data", () => {
		it("aggregates stats", async () => {
			const start = DateTime.fromISO("2026-04-01T00:00:00Z", {
				setZone: true
			})
			const end = DateTime.fromISO("2026-04-30T23:59:59Z", {
				setZone: true
			})
			const stats = await new PeriodAggregates(VEHICLE_ID, start, end).execute(
				DbInstance.client
			)

			expect(stats).toEqual({
				avgConsumption: 17.5, // 14, 21
				avgDuration: 37.5, // 45, 30
				avgSpeed: 30, // 20, 40
				totalDistance: 25, // 15 + 10
				totalDuration: 75, // 45 + 30
				tripCount: 2
			})
		})
	})
})
