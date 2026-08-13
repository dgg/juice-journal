import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../client"
import { statsQueries } from "./stats"
import { tripsQueries } from "./trips"

const TEST_VEHICLE_ID = "V1StGXR8_Z5jdHi6"
const CLEANUP_TRIPS: Array<{ start: string; end: string }> = []

beforeAll(async () => {
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`
		await db`DELETE FROM vehicles WHERE id = ${TEST_VEHICLE_ID}`
	} catch {}
})

async function seedTrip(opts: {
	start: string
	end: string
	duration_min: number
	distance_km: number
	avg_speed_kmh?: number
	avg_consumption_kwh_100km?: number
}) {
	await tripsQueries.createTrip({
		vehicle_id: TEST_VEHICLE_ID,
		start_time: opts.start,
		end_time: opts.end,
		daypart: "morning",
		duration_min: opts.duration_min,
		distance_km: opts.distance_km,
		avg_speed_kmh: opts.avg_speed_kmh,
		avg_consumption_kwh_100km: opts.avg_consumption_kwh_100km
	})
	CLEANUP_TRIPS.push({ start: opts.start, end: opts.end })
}

describe("statsQueries", () => {
	describe("monthlyAggregates (backwards compat)", () => {
		it("returns null aggregates when no trips", async () => {
			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-01-01T00:00:00Z",
				endUtc: "2026-02-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})
			expect(result.avgConsumption).toBeNull()
			expect(result.avgDuration).toBeNull()
			expect(result.totalDistance).toBeNull()
		})

		it("computes aggregates for trips in window", async () => {
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-10T08:00:00Z",
				end_time: "2026-07-10T08:45:00Z",
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.0,
				avg_consumption_kwh_100km: 20.0
			})
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: "2026-07-11T08:00:00Z",
				end_time: "2026-07-11T08:30:00Z",
				daypart: "morning",
				duration_min: 30,
				distance_km: 10.0,
				avg_consumption_kwh_100km: 18.0
			})

			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-07-01T00:00:00Z",
				endUtc: "2026-08-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})

			expect(result.avgConsumption).toBe(19.0)
			expect(result.avgDuration).toBe(37.5)
			expect(result.totalDistance).toBe(25.0)
		})

		it("works without vehicle filter", async () => {
			const result = await statsQueries.monthlyAggregates({
				startUtc: "2026-07-01T00:00:00Z",
				endUtc: "2026-08-01T00:00:00Z"
			})
			expect(result.avgConsumption).not.toBeNull()
			expect(result.avgDuration).not.toBeNull()
			expect(result.totalDistance).not.toBeNull()
		})
	})

	describe("periodAggregates", () => {
		it("returns nulls when no trips", async () => {
			const result = await statsQueries.periodAggregates({
				startUtc: "2025-01-01T00:00:00Z",
				endUtc: "2025-02-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})
			expect(result.avgConsumption).toBeNull()
			expect(result.avgDuration).toBeNull()
			expect(result.totalDistance).toBeNull()
			expect(result.avgSpeed).toBeNull()
			expect(result.tripCount).toBeNull()
		})

		it("includes avgSpeed and tripCount", async () => {
			await seedTrip({
				start: "2026-06-01T08:00:00Z",
				end: "2026-06-01T08:45:00Z",
				duration_min: 45,
				distance_km: 15.0,
				avg_speed_kmh: 20.0,
				avg_consumption_kwh_100km: 18.0
			})
			await seedTrip({
				start: "2026-06-02T08:00:00Z",
				end: "2026-06-02T08:30:00Z",
				duration_min: 30,
				distance_km: 10.0,
				avg_speed_kmh: 40.0,
				avg_consumption_kwh_100km: 20.0
			})

			const result = await statsQueries.periodAggregates({
				startUtc: "2026-06-01T00:00:00Z",
				endUtc: "2026-07-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID
			})

			expect(result.avgSpeed).toBe(30.0)
			expect(result.tripCount).toBe(2)
			expect(result.avgConsumption).toBe(19.0)
			expect(result.totalDistance).toBe(25.0)
		})
	})

	describe("periodSeries", () => {
		it("returns per-trip rows for bucket=trip", async () => {
			const series = await statsQueries.periodSeries({
				startUtc: "2026-06-01T00:00:00Z",
				endUtc: "2026-07-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID,
				bucket: "trip"
			})

			expect(series.length).toBeGreaterThanOrEqual(2)
			expect(series[0]!.distance_km).toBeGreaterThan(0)
			expect(series[0]!.duration_min).toBeGreaterThan(0)
			expect(typeof series[0]!.label).toBe("string")
		})

		it("returns bucketed rows for bucket=month", async () => {
			const series = await statsQueries.periodSeries({
				startUtc: "2026-06-01T00:00:00Z",
				endUtc: "2026-07-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID,
				bucket: "month"
			})

			expect(series.length).toBe(1)
			expect(series[0]!.distance_km).toBe(25.0)
			expect(series[0]!.duration_min).toBe(75)
			expect(series[0]!.avg_speed_kmh).toBe(30.0)
			expect(series[0]!.avg_consumption_kwh_100km).toBe(19.0)
			expect(typeof series[0]!.label).toBe("string")
		})

		it("returns bucketed rows for bucket=week", async () => {
			const series = await statsQueries.periodSeries({
				startUtc: "2026-06-01T00:00:00Z",
				endUtc: "2026-07-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID,
				bucket: "week"
			})

			expect(series.length).toBeGreaterThanOrEqual(1)
			// Two trips on same week should be in same bucket
			expect(series[0]!.distance_km).toBe(25.0)
			expect(series[0]!.duration_min).toBe(75)
		})

		it("returns empty array for empty period", async () => {
			const series = await statsQueries.periodSeries({
				startUtc: "2025-01-01T00:00:00Z",
				endUtc: "2025-02-01T00:00:00Z",
				vehicleId: TEST_VEHICLE_ID,
				bucket: "trip"
			})

			expect(series).toEqual([])
		})
	})
})
