import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../client"
import { locationsQueries, type LocationRow } from "./locations"

const TEST_LOCATION_ID = "LocTestId1234_abcd"

beforeAll(async () => {
	try {
		await db`
			INSERT INTO locations (id, label, latitude, longitude, timezone)
			VALUES (${TEST_LOCATION_ID}, 'Test Weather Loc', 55.730911, 9.620926, 'Europe/Copenhagen')
		`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM locations WHERE id = ${TEST_LOCATION_ID}`
	} catch {}
})

describe("locationsQueries", () => {
	describe("findLocationById", () => {
		it("returns a location row for an existing id", async () => {
			const result = await locationsQueries.findLocationById(TEST_LOCATION_ID)

			expect(result).not.toBeNull()
			expect(result!.id).toBe(TEST_LOCATION_ID)
			expect(result!.label).toBe("Test Weather Loc")
			expect(result!.latitude).toBeCloseTo(55.730911, 5)
			expect(result!.longitude).toBeCloseTo(9.620926, 5)
			expect(result!.timezone).toBe("Europe/Copenhagen")
		})

		it("returns null for a non-existing id", async () => {
			const result = await locationsQueries.findLocationById("nonexistent_id_123")
			expect(result).toBeNull()
		})
	})

	describe("listAllLocations", () => {
		it("includes the test location with lat/long", async () => {
			const all = await locationsQueries.listAllLocations()
			const found = all.find((l) => l.id === TEST_LOCATION_ID)

			expect(found).toBeDefined()
			expect(found!.latitude).toBeCloseTo(55.730911, 5)
			expect(found!.longitude).toBeCloseTo(9.620926, 5)
		})
	})

	describe("findLocationByLabel", () => {
		it("returns a location with lat/long", async () => {
			const result = await locationsQueries.findLocationByLabel("Test Weather Loc")

			expect(result).not.toBeNull()
			expect(result!.latitude).toBeCloseTo(55.730911, 5)
			expect(result!.longitude).toBeCloseTo(9.620926, 5)
		})

		it("returns null for a non-existing label", async () => {
			const result = await locationsQueries.findLocationByLabel("NonExistentLabel_XYZ")
			expect(result).toBeNull()
		})
	})
})