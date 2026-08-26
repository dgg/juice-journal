import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../client"
import { tripsQueries } from "./trips"
import { vehiclesQueries } from "./vehicles"
import { locationsQueries } from "./locations"
import { DateTime } from "luxon"

function utcIso(s: string): DateTime {
	return DateTime.fromISO(s, { setZone: true }).toUTC()
}

const TEST_VEHICLE_ID = "V1StGXR8_Z5jdHi6"
const TEST_LOCATION_ID = "Bw_0wK4q2xJp5m7n"

/*beforeAll(async () => {
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')`
	} catch {}
	try {
		await db`
			INSERT INTO locations (id, label, latitude, longitude)
			VALUES (${TEST_LOCATION_ID}, 'Home', 55.676098, 12.568337)
		`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`
		await db`DELETE FROM vehicles WHERE id = ${TEST_VEHICLE_ID}`
		await db`DELETE FROM locations WHERE id = ${TEST_LOCATION_ID}`
	} catch {}
})*/

describe.skip("tripsQueries", () => {
	describe("createTrip", () => {
		it("inserts a trip and returns typed TripRow with DateTime fields", async () => {
			const result = await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: utcIso("2026-07-20T08:00:00Z"),
				end_time: utcIso("2026-07-20T08:45:00Z"),
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5,
				avg_speed_kmh: 60.0,
				avg_consumption_kwh_100km: 18.5,
				odometer_km: 12345.0,
				start_location_id: TEST_LOCATION_ID,
				end_location_id: TEST_LOCATION_ID
			})

			expect(result.vehicle_id).toBe(TEST_VEHICLE_ID)
			expect(result.daypart).toBe("morning")
			expect(result.duration_min).toBe(45)
			expect(result.distance_km).toBe(15.5)
			expect(result.avg_speed_kmh).toBe(60.0)
			expect(result.avg_consumption_kwh_100km).toBe(18.5)
			expect(result.odometer_km).toBe(12345.0)
			expect(result.start_time).toBeInstanceOf(DateTime)
			expect(result.end_time).toBeInstanceOf(DateTime)
			expect(result.tracking_created).toBeInstanceOf(DateTime)
			expect(result.tracking_updated).toBeInstanceOf(DateTime)
			expect(result.start_time.zoneName).toBe("UTC")
		})
	})

	describe("findTripsByMonth", () => {
		it("returns trips within month window", async () => {
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: utcIso("2026-07-21T08:00:00Z"),
				end_time: utcIso("2026-07-21T08:45:00Z"),
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5
			})

			const trips = await tripsQueries.findTripsByMonth({
				startUtc: utcIso("2026-07-01T00:00:00Z"),
				endUtc: utcIso("2026-08-01T00:00:00Z")
			})

			const testTrips = trips.filter((t) => t.vehicle_id === TEST_VEHICLE_ID)
			expect(testTrips.length).toBeGreaterThanOrEqual(1)
			expect(testTrips[0].end_time).toBeInstanceOf(DateTime)
		})
	})

	describe("existsTripByVehicleAndEndTime", () => {
		it("returns true when trip exists", async () => {
			const exists = await tripsQueries.existsTripByVehicleAndEndTime({
				vehicleId: TEST_VEHICLE_ID,
				endTime: utcIso("2026-07-20T08:45:00Z")
			})
			expect(exists).toBe(true)
		})

		it("returns false when trip does not exist", async () => {
			const exists = await tripsQueries.existsTripByVehicleAndEndTime({
				vehicleId: TEST_VEHICLE_ID,
				endTime: utcIso("2026-01-01T00:00:00Z")
			})
			expect(exists).toBe(false)
		})
	})

	describe("findLatestTripVehicleId", () => {
		it("returns vehicle id of most recent trip", async () => {
			// Insert a trip with a very recent end_time to ensure it's the latest
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: utcIso("2099-12-31T23:00:00Z"),
				end_time: utcIso("2099-12-31T23:30:00Z"),
				daypart: "afternoon",
				duration_min: 30,
				distance_km: 10.0
			})

			const vid = await tripsQueries.findLatestTripVehicleId()
			expect(vid).toBe(TEST_VEHICLE_ID)
		})
	})

	describe("findTripsWithLocations", () => {
		it("returns trips with location labels", async () => {
			// Create a trip with location IDs in the current month
			await tripsQueries.createTrip({
				vehicle_id: TEST_VEHICLE_ID,
				start_time: utcIso("2026-07-22T08:00:00Z"),
				end_time: utcIso("2026-07-22T08:45:00Z"),
				daypart: "morning",
				duration_min: 45,
				distance_km: 15.5,
				start_location_id: TEST_LOCATION_ID,
				end_location_id: TEST_LOCATION_ID
			})

			const trips = await tripsQueries.findTripsWithLocations({
				startUtc: utcIso("2026-07-01T00:00:00Z"),
				endUtc: utcIso("2026-08-01T00:00:00Z"),
				vehicleId: TEST_VEHICLE_ID
			})

			const testTrips = trips.filter((t) => t.id)
			expect(testTrips.length).toBeGreaterThanOrEqual(1)
			expect(testTrips[0].start_location).toBe("Home")
			expect(testTrips[0].end_location).toBe("Home")
			expect(testTrips[0].start_time).toBeInstanceOf(DateTime)
		})
	})
})

describe.skip("vehiclesQueries", () => {
	describe("vehicleExists", () => {
		it("returns true for existing vehicle", async () => {
			const exists = await vehiclesQueries.vehicleExists(TEST_VEHICLE_ID)
			expect(exists).toBe(true)
		})

		it("returns false for non-existing vehicle", async () => {
			const exists = await vehiclesQueries.vehicleExists("nonexistent")
			expect(exists).toBe(false)
		})
	})
})

describe.skip("locationsQueries", () => {
	describe("locationExists", () => {
		it("returns true for existing location", async () => {
			const exists = await locationsQueries.locationExists(TEST_LOCATION_ID)
			expect(exists).toBe(true)
		})

		it("returns false for non-existing location", async () => {
			const exists = await locationsQueries.locationExists("nonexistent")
			expect(exists).toBe(false)
		})
	})
})
