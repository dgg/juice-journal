import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { db } from "../db/client"
import { sql, SQL } from "bun"
import { homeHandler } from "./home"
import { DateTime } from "luxon"

const TEST_VEHICLE_ID = "TestVehicleHomeHandler"
const TEST_LOCATION_ID = "TestLocationHomeHandler"
const TEST_VEHICLE_ID_2 = "TestVehicleHomeHandler2"

const createMockContext = () => ({
	req: {
		valid: (type: string) => ({})
	},
	var: {
		logger: {
			info: (...args: any[]) => {},
			warn: (...args: any[]) => {},
			error: (...args: any[]) => {}
		}
	},
	html: (data: string, status = 200) => ({ data, status })
})

beforeAll(async () => {
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VEHICLE_ID}, 'Test Vehicle')`
	} catch {}
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VEHICLE_ID_2}, 'Second Vehicle')`
	} catch {}
	try {
		await db`
			INSERT INTO locations (id, label, latitude, longitude, timezone)
			VALUES (${TEST_LOCATION_ID}, 'Test Location', 55.676098, 12.568337, 'Europe/Copenhagen')
		`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id IN (${TEST_VEHICLE_ID}, ${TEST_VEHICLE_ID_2})`
		await db`DELETE FROM vehicles WHERE id IN (${TEST_VEHICLE_ID}, ${TEST_VEHICLE_ID_2})`
		await db`DELETE FROM locations WHERE id = ${TEST_LOCATION_ID}`
	} catch {}
})

describe.skip("homeHandler", () => {
	it("returns HTML with populated month stats and trip list", async () => {
		// Insert trips in current month
		const now = DateTime.now()
		const startOfMonth = now.startOf("month")
		const tripDate = startOfMonth.plus({ days: 5 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_speed_kmh, avg_consumption_kwh_100km, odometer_km,
				start_location_id, end_location_id
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				60.0, 18.5, 12345.0,
				${TEST_LOCATION_ID}, ${TEST_LOCATION_ID}
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)

		expect(result.status).toBe(200)
		expect(typeof result.data).toBe("string")
		expect(result.data).toContain("Avg consumption")
		expect(result.data).toContain("18.5")
		expect(result.data).toContain("Test Vehicle")
		expect(result.data).toContain("Trips")
	})

	it("shows empty state when no trips exist", async () => {
		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)

		expect(result.status).toBe(200)
		expect(result.data).toContain("No trips yet")
	})

	it("handles NULL consumption gracefully", async () => {
		const now = DateTime.now()
		const tripDate = now.startOf("month").plus({ days: 3 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 12.0
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)

		expect(result.status).toBe(200)
		expect(result.data).toContain("--")
	})

	it("shows prev-month delta when data exists", async () => {
		const now = DateTime.now()
		const currentDate = now.startOf("month").plus({ days: 5 })
		const prevDate = now.minus({ months: 1 }).startOf("month").plus({ days: 5 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_consumption_kwh_100km
			) VALUES (
				${TEST_VEHICLE_ID},
				${currentDate.toUTC().toISO()},
				${currentDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				20.0
			)
		`

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_consumption_kwh_100km
			) VALUES (
				${TEST_VEHICLE_ID},
				${prevDate.toUTC().toISO()},
				${prevDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				22.0
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)

		expect(result.status).toBe(200)
		expect(result.data).toContain("vs last month")
	})

	it("selects vehicle from most recent trip", async () => {
		const now = DateTime.now()

		// Insert trip for vehicle 2 (more recent)
		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID_2},
				${now.minus({ days: 1 }).toUTC().toISO()},
				${now.minus({ days: 1 }).plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 10.0
			)
		`

		// Insert older trip for vehicle 1
		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID},
				${now.minus({ days: 5 }).toUTC().toISO()},
				${now.minus({ days: 5 }).plus({ minutes: 30 }).toUTC().toISO()},
				'morning', 30, 10.0
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)

		expect(result.status).toBe(200)
		expect(result.data).toContain("Second Vehicle")
	})
})
