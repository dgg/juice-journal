import { sql } from "bun"
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { DateTime } from "luxon"

import { DbInstance } from "../../../../fixture-setup"

import type { TripDetail } from "../trips/trips"
import type { VehicleRow } from "../vehicles/VehicleRow"

import { BucketAggregations } from "./BucketAggregations"

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

const VEHICLE_ID = "vhcl_BucketAggregations"

const seedVehicle = async (vehicle: VehicleRow): Promise<void> =>
	DbInstance.client`INSERT INTO vehicles ${sql(vehicle)}`

describe(BucketAggregations.name, () => {
	beforeAll(async () => {
		await seedVehicle({
			id: VEHICLE_ID,
			description: "BucketAggregations"
		})
		await Promise.all([
			seedTrip({
				start_time: "2026-06-01T08:00:00Z",
				end_time: "2026-06-01T08:45:00Z",
				duration: 45,
				distance: 15,
				speed: 20,
				consumption: 14
			}),
			seedTrip({
				start_time: "2026-06-01T15:00:00Z",
				end_time: "2026-06-01T15:30:00Z",
				duration: 30,
				distance: 10.0,
				speed: 40.0,
				consumption: 21.0
			}),
			seedTrip({
				start_time: "2026-06-15T08:00:00Z",
				end_time: "2026-06-15T08:36:00Z",
				duration: 36,
				distance: 14,
				speed: 36,
				consumption: 27
			}),
			seedTrip({
				start_time: "2026-07-15T08:00:00Z",
				end_time: "2026-07-15T08:35:00Z",
				duration: 35,
				distance: 14,
				speed: 30,
				consumption: 25
			})
		])
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	describe("trip date aggregation", () => {
		describe("year / week aggregation", () => {
			describe("no data", () => {
				it("no stats", async () => {
					const start = DateTime.fromISO("2024-01-01T00:00:00Z", {
						setZone: true
					})
					const end = DateTime.fromISO("2024-12-31T23:59:59Z", {
						setZone: true
					})
					const stats = await new BucketAggregations(
						VEHICLE_ID,
						start,
						end,
						"week"
					).execute(DbInstance.client)

					expect(stats).toBeEmpty()
				})
			})

			describe("missing data", () => {
				beforeAll(async () => {
					await Promise.all([
						seedTrip({
							start_time: "2025-06-01T08:00:00Z",
							end_time: "2025-06-01T08:45:00Z",
							duration: 45,
							distance: 15,
							speed: null,
							consumption: 14
						}),
						seedTrip({
							start_time: "2025-06-01T15:00:00Z",
							end_time: "2025-06-01T15:30:00Z",
							duration: 30,
							distance: 10.0,
							speed: null,
							consumption: null
						})
					])
				})

				it("missing data ignored", async () => {
					const start = DateTime.fromISO("2025-01-01T00:00:00Z", {
						setZone: true
					})
					const end = DateTime.fromISO("2025-12-31T23:59:59Z", {
						setZone: true
					})
					const stats = await new BucketAggregations(
						VEHICLE_ID,
						start,
						end,
						"week"
					).execute(DbInstance.client)

					expect(stats).toHaveLength(1)
					expect(stats[0]?.speed).toBeNull() // no data at all -> null
					expect(stats[0]?.consumption).toEqual(14) // missing data does not contribute to aggregation
				})
			})

			it("agregates trips into 3 different weeks", async () => {
				const start = DateTime.fromISO("2026-01-01T00:00:00Z", { setZone: true })
				const end = DateTime.fromISO("2026-12-31T23:59:59Z", { setZone: true })
				const stats = await new BucketAggregations(
					VEHICLE_ID,
					start,
					end,
					"week"
				).execute(DbInstance.client)

				expect(stats).toHaveLength(3)
				// W23
				expect(stats[0]).toEqual({
					duration: 75,
					distance: 25,
					speed: 30,
					consumption: 17.5,
					time: DateTime.fromISO("2026-06-01T00:00:00Z", { setZone: true })
				})
				// W25
				expect(stats[1]).toEqual({
					duration: 36,
					distance: 14,
					speed: 36,
					consumption: 27,
					time: DateTime.fromISO("2026-06-15T00:00:00Z", { setZone: true })
				})
				// W29
				expect(stats[2]).toEqual({
					duration: 35,
					distance: 14,
					speed: 30,
					consumption: 25,
					time: DateTime.fromISO("2026-07-13T00:00:00Z", { setZone: true })
				})
			})
		})
		describe("year / month aggregation", () => {
			it("agregates trips into 2 different months", async () => {
				const start = DateTime.fromISO("2026-01-01T00:00:00Z", { setZone: true })
				const end = DateTime.fromISO("2026-12-31T23:59:59Z", { setZone: true })
				const stats = await new BucketAggregations(
					VEHICLE_ID,
					start,
					end,
					"month"
				).execute(DbInstance.client)

				//
				expect(stats).toHaveLength(2)
				// Jun
				expect(stats[0]).toMatchObject({
					duration: 111,
					distance: 39,
					speed: 32,
					// consumption is fractionary (cannot equal)
					time: DateTime.fromISO("2026-06-01T00:00:00Z", { setZone: true })
				})
				expect(stats[0]?.consumption).toBeCloseTo(20.6, 0.06)

				// Jul
				expect(stats[1]).toEqual({
					duration: 35,
					distance: 14,
					speed: 30,
					consumption: 25,
					time: DateTime.fromISO("2026-07-01T00:00:00Z", { setZone: true })
				})
			})
		})

		describe("month - day aggregation", () => {
			describe("no data", () => {
				it("no stats", async () => {
					const start = DateTime.fromISO("2024-06-01T00:00:00Z", {
						setZone: true
					})
					const end = DateTime.fromISO("2024-06-30T23:59:59Z", {
						setZone: true
					})
					const stats = await new BucketAggregations(
						VEHICLE_ID,
						start,
						end,
						"day"
					).execute(DbInstance.client)

					expect(stats).toBeEmpty()
				})
			})
			it("agregates trips into 2 different days", async () => {
				const start = DateTime.fromISO("2026-06-01T00:00:00Z", { setZone: true })
				const end = DateTime.fromISO("2026-06-30T23:59:59Z", { setZone: true })
				const stats = await new BucketAggregations(
					VEHICLE_ID,
					start,
					end,
					"day"
				).execute(DbInstance.client)

				expect(stats).toHaveLength(2)
				// 1st Jun
				expect(stats[0]).toMatchObject({
					duration: 75,
					distance: 25,
					speed: 30,
					consumption: 17.5,
					time: DateTime.fromISO("2026-06-01T00:00:00Z", { setZone: true })
				})

				// 15th Jul
				expect(stats[1]).toEqual({
					duration: 36,
					distance: 14,
					speed: 36,
					consumption: 27,
					time: DateTime.fromISO("2026-06-15T00:00:00Z", { setZone: true })
				})
			})
		})
	})
})
