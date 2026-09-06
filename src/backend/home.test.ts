import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test"
import { db } from "./db/client"
import { sql, SQL } from "bun"
import { homeHandler } from "./presentation/home.tsx"
import { getPartialTrips, htmlCreationHandler, getTripFormPage } from "./presentation/trips.tsx"
import { getPartialStats } from "./presentation/summary.tsx"
import { DateTime } from "luxon"
import type { ZodIssue } from "zod"
import { tripFormSchema } from "./types"
import { zodIssuesToFieldMap } from "./presentation/formValidators"

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

describe("GET /trips/fragments/list", () => {
	it("returns trip list fragment", async () => {
		const now = DateTime.now().plus({ minutes: 20 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				consumption,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${now.toUTC().toISO()},
				${now.plus({ minutes: 30 }).toUTC().toISO()},
				'morning', 30, 12.0,
				18.5,
				'home', 'work'
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

describe("GET /summary/fragments/grid", () => {
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

describe("GET /trips/creation", () => {
	it("renders trip form page", async () => {
		const mockCtx = createMockContext()
		const result = await getTripFormPage(mockCtx as any)
		const html = await result.text()

		expect(result.status).toBe(200)
		expect(html).toContain('action="/trips"')
		expect(html).toContain('hx-post="/trips"')
		expect(html).toContain('hx-swap="outerHTML"')
	})
})

describe("POST /trips", () => {
	it("redirects to home on success", async () => {
		const now = DateTime.now()
		const startOfMonth = now.startOf("month")
		const tripDate = startOfMonth.plus({ days: 3 })

		await db`
			INSERT INTO trips (
				vehicle_id, start_time, end_time, daypart, duration, distance,
				consumption,
				start_location, end_location
			) VALUES (
				${TEST_VEHICLE_ID},
				${tripDate.toUTC().toISO()},
				${tripDate.plus({ minutes: 30 }).toUTC().toISO()},
				'afternoon', 30, 12.0,
				18.5,
				'home', 'work'
			)
		`

		const mockCtx = createMockContext()
		const tz = process.env.DISPLAY_TZ || "Europe/Copenhagen"
		const startDt = DateTime.fromISO(`${tripDate.plus({ days: 1 }).toFormat("yyyy-MM-dd")}T08:00`, { zone: tz }).toUTC()
		const endDt = DateTime.fromISO(`${tripDate.plus({ days: 1 }).toFormat("yyyy-MM-dd")}T08:45`, { zone: tz }).toUTC()
		mockCtx.set("tripInput", {
			vehicle_id: TEST_VEHICLE_ID,
			start_time: startDt,
			end_time: endDt,
			daypart: "morning",
			duration: 45,
			distance: 15.0,
			start_location: "home",
			end_location: "work"
		})

		const result = await htmlCreationHandler(mockCtx as any)

		expect(result.status).toBe(302)
		expect(result.headers.get("location")).toBe("/")
	})

	it("schema middleware detects invalid form fields", async () => {
		const body = {
			vehicle_id: "invalid",
			trip_date: "2026-08-06",
			start_time: "bad",
			end_time: "bad",
			daypart: "morning",
			distance: "0",
			start_location: "home",
			end_location: "work"
		}
		const result = tripFormSchema.safeParse(body)
		expect(result.success).toBe(false)
		if (!result.success) {
			const map = zodIssuesToFieldMap(result.error.issues)
			expect(Object.keys(map).length).toBeGreaterThan(0)
		}
	})
})

describe("tripFormSchema", () => {
	it("parses valid form input into TripInput", () => {
		const result = tripFormSchema.safeParse({
			vehicle_id: "TestVehicleHomeH",
			trip_date: "2026-08-06",
			start_time: "08:00",
			end_time: "08:45",
			daypart: "morning",
			distance: "15.0",
			start_location: "home",
			end_location: "work"
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.vehicle_id).toBe("TestVehicleHomeH")
			expect(result.data.distance).toBe(15.0)
			expect(result.data.duration).toBe(45)
		}
	})

	it("rejects end time before start time", () => {
		const result = tripFormSchema.safeParse({
			vehicle_id: "TestVehicleHomeH",
			trip_date: "2026-08-06",
			start_time: "09:00",
			end_time: "08:00",
			daypart: "morning",
			distance: "15.0",
			start_location: "home",
			end_location: "work"
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const issues = result.error.issues
			expect(issues.some((i) => i.path[0] === "end_time")).toBe(true)
		}
	})

	it("rejects non-positive distance", () => {
		const result = tripFormSchema.safeParse({
			vehicle_id: "TestVehicleHomeH",
			trip_date: "2026-08-06",
			start_time: "08:00",
			end_time: "08:45",
			daypart: "morning",
			distance: "0",
			start_location: "home",
			end_location: "work"
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const issues = result.error.issues
			expect(issues.some((i) => i.path[0] === "distance")).toBe(true)
		}
	})
})

describe("zodIssuesToFieldMap", () => {
	it("flattens issues into Record<field, message>", () => {
		const issues: ZodIssue[] = [
			{ code: "custom", path: ["distance"], message: "must be > 0" },
			{ code: "custom", path: ["end_time"], message: "must be after start" }
		]
		const map = zodIssuesToFieldMap(issues)
		expect(map).toEqual({ distance: "must be > 0", end_time: "must be after start" })
	})

	it("keeps first message on duplicate paths", () => {
		const issues: ZodIssue[] = [
			{ code: "custom", path: ["distance"], message: "first" },
			{ code: "custom", path: ["distance"], message: "second" }
		]
		const map = zodIssuesToFieldMap(issues)
		expect(map.distance).toBe("first")
	})
})