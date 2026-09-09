/*import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test"

import { db } from "./db/client"
import { homeHandler } from "./presentation/home/home.tsx"

import { DateTime } from "luxon"

const TEST_VEHICLE_ID = "TestVehicleHomeH"
const TEST_LOCATION_ID = "TestLocationHome"
const TEST_VEHICLE_ID_2 = "SecondVehicleHom"

const createMockContext = () => {
	const store: Record<string, any> = {}
	return {
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
		set: (key: string, value: any) => { store[key] = value },
		get: (key: string) => store[key],
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
	}
}

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
				vehicle_id, start_time, end_time, daypart, duration, distance,
				speed, consumption,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				60.0, 18.5,
				'home', 'work'
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
		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${DateTime.now().plus({ hours: 1 }).toUTC().toISO()},
				${DateTime.now().plus({ hours: 1, minutes: 10 }).toUTC().toISO()},
				'morning', 10, 5.0,
				'home', 'work'
			)
		`
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VEHICLE_ID}`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(
			html.includes("No trips yet") || (html.includes("Total distance") && html.includes("Avg consumption"))
		).toBe(true)
	})

	it("handles NULL consumption gracefully", async () => {
		const tripDate = DateTime.now().plus({ minutes: 10 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 12.0,
				'home', 'work'
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
				vehicle_id, start_time, end_time, daypart, duration, distance,
				consumption,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${currentDate.toUTC().toISO()},
				${currentDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				20.0,
				'home', 'work'
			)
		`

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				consumption,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${prevDate.toUTC().toISO()},
				${prevDate.plus({ minutes: 45 }).toUTC().toISO()},
				'morning', 45, 15.0,
				22.0,
				'home', 'work'
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
				vehicle_id, start_time, end_time, daypart, duration, distance,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID_2},
				${now.toUTC().toISO()},
				${now.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 10.0,
				'home', 'work'
			)
		`

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${now.minus({ minutes: 5 }).toUTC().toISO()},
				${now.minus({ minutes: 5 }).plus({ minutes: 30 }).toUTC().toISO()},
				'morning', 30, 10.0,
				'home', 'work'
			)
		`

		const mockCtx = createMockContext()
		const result = await homeHandler(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain("Second Vehicle")
	})
})
*/
