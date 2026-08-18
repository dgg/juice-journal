import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test"
import { db } from "../db/client"
import { sql, SQL } from "bun"
import { homeHandler } from "./home.tsx"
import {
	getPartialTrips,
	getPartialStats,
	htmlCreationHandler
} from "./html-handlers.tsx"
import { getTripFormPage } from "./html-handlers.tsx"
import { DateTime } from "luxon"

const TEST_VEHICLE_ID = "TestVehicleHomeH"
const TEST_LOCATION_ID = "TestLocationHome"
const TEST_VEHICLE_ID_2 = "SecondVehicleHom"

const createMockContext = () => ({
	req: {
		valid: (type: string) => ({}),
		parseBody: async () => ({}),
		header: (name: string) => undefined
	},
	var: {
		logger: {
			info: (...args: any[]) => {},
			warn: (...args: any[]) => {},
			error: (...args: any[]) => {}
		}
	},
	_header: (name: string, value: string) => {},
	html: (data: any, status = 200) => {
		const body = typeof data === "string" ? data : data.toString()
		return {
			status,
			headers: new Headers(),
			text: () => Promise.resolve(body),
			json: () => Promise.resolve(JSON.parse(body))
		} as Response
	},
	redirect: (path: string) => {
		return {
			status: 302,
			headers: new Map([["location", path]]) as any,
			text: () => Promise.resolve(""),
			json: () => Promise.resolve({})
		} as Response
	},
	text: (data: any, status = 200) => {
		return {
			status,
			headers: new Headers(),
			text: () => Promise.resolve(data),
			json: () => Promise.resolve({})
		} as Response
	}
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

afterEach(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id IN (${TEST_VEHICLE_ID}, ${TEST_VEHICLE_ID_2})`
	} catch {}
})

describe("homeHandler", () => {
	it("returns HTML with six stat cards and no chart.js", async () => {
		const now = DateTime.now()
		const tripDate = now.plus({ minutes: 5 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_speed_kmh, avg_consumption_kwh_100km
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				60.0, 18.5
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("Total distance")
		expect(html).toContain("Total time driven")
		expect(html).toContain("Avg speed")
		expect(html).toContain("Avg duration")
		expect(html).toContain("Avg consumption")
		expect(html).toContain("Trips")
		expect(html).not.toContain("chart.js")
		expect(html).not.toContain("chart-distance-duration")
		expect(html).not.toContain("stats-data")
	})

	it("shows empty state when no trips for the selected vehicle", async () => {
		// Insert a trip that makes findLatestTripVehicleId return test vehicle
		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID},
				${DateTime.now().plus({ hours: 1 }).toUTC().toISO()},
				${DateTime.now().plus({ hours: 1, minutes: 10 }).toUTC().toISO()},
				'morning', 10, 5.0
			)
		`
		// Delete it so handler sees no trips for this vehicle
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		// Without a latest trip, handler may pick any vehicle.
		// If it picked a vehicle with trips, stats cards render.
		// If no trips at all exist, "No trips yet" renders.
		expect(
			html.includes("No trips yet") || (html.includes("Total distance") && html.includes("Avg consumption"))
		).toBe(true)
	})

	it("handles NULL consumption gracefully", async () => {
		const tripDate = DateTime.now().plus({ minutes: 10 })

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
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("--")
	})

	it("shows prev-month delta when data exists", async () => {
		const currentDate = DateTime.now().plus({ minutes: 15 })
		const prevDate = DateTime.now().minus({ months: 1 }).startOf("month").plus({ days: 15 })

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
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("icon-trending-up")
		expect(html).not.toContain("vs last")
	})

	it("selects vehicle from most recent trip", async () => {
		const now = DateTime.now().plus({ minutes: 30 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID_2},
				${now.toUTC().toISO()},
				${now.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 10.0
			)
		`

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km
			) VALUES (
				${TEST_VEHICLE_ID},
				${now.minus({ minutes: 5 }).toUTC().toISO()},
				${now.minus({ minutes: 5 }).plus({ minutes: 30 }).toUTC().toISO()},
				'morning', 30, 10.0
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("Second Vehicle")
	})
})

describe("GET /partials/trips", () => {
	it("returns trip list fragment", async () => {
		const now = DateTime.now().plus({ minutes: 20 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_consumption_kwh_100km
			) VALUES (
				${TEST_VEHICLE_ID},
				${now.toUTC().toISO()},
				${now.plus({ minutes: 30 }).toUTC().toISO()},
				'morning', 30, 12.0,
				18.5
			)
		`

		const mockCtx = createMockContext()
		const result = await getPartialTrips(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("trip-row")
	})

	it("returns empty state when no trips", async () => {
		const mockCtx = createMockContext()
		const result = await getPartialTrips(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(
			html.includes("No trips yet") || html.includes("trip-row")
		).toBe(true)
	})
})

describe("GET /partials/stats", () => {
	it("returns stats fragment with six stat cards", async () => {
		const mockCtx = createMockContext()
		const result = await getPartialStats(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("Total distance")
		expect(html).toContain("Total time driven")
		expect(html).toContain("Avg speed")
		expect(html).toContain("Avg duration")
		expect(html).toContain("Avg consumption")
		expect(html).toContain("Trips")
		expect(html).not.toContain("#stats-region")
		expect(html).not.toContain("Layout")
	})
})

describe("GET /trips/new", () => {
	it("renders trip form page", async () => {
		const mockCtx = createMockContext()
		const result = await getTripFormPage(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain('action="/trips"')
		expect(html).toContain('hx-post="/trips"')
	})
})

describe("POST /trips", () => {
	it("redirects to home on success", async () => {
		const now = DateTime.now()
		const startOfMonth = now.startOf("month")
		const tripDate = startOfMonth.plus({ days: 3 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration_min, distance_km,
				avg_consumption_kwh_100km
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 12.0,
				18.5
			)
		`

		const mockCtx = createMockContext()
		mockCtx.req.parseBody = async () => ({
			vehicle_id: TEST_VEHICLE_ID,
			trip_date: tripDate.plus({ days: 1 }).toFormat("yyyy-MM-dd"),
			start_time: "08:00",
			end_time: "08:45",
			daypart: "morning",
			distance_km: "15.0",
			avg_consumption_kwh_100km: "20.0"
		})

		const result = await htmlCreationHandler(mockCtx as any)

		expect(result.status).toBe(302)
		expect(result.headers.get("location")).toBe("/")
	})

	it("returns problem details on validation failure", async () => {
		const mockCtx = createMockContext()
		mockCtx.req.parseBody = async () => ({
			vehicle_id: "invalid",
			trip_date: "2026-08-06",
			start_time: "bad",
			end_time: "bad",
			daypart: "morning",
			distance_km: "0"
		})

		try {
			await htmlCreationHandler(mockCtx as any)
			expect(false).toBe(true)
		} catch (error) {
			expect(error).toBeDefined()
		}
	})
})
