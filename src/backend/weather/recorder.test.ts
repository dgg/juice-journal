/*import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { db } from "../../db/client"
import { tripsQueries } from "../../db/queries/trips"
import { recordWeather } from "./storage"

const TEST_VID = "RecTestVehicle01"
const TEST_LOC_ID = "RecTestLocation01"

beforeAll(async () => {
	try {
		await db`INSERT INTO vehicles (id, description) VALUES (${TEST_VID}, 'Recorder Test')`
	} catch {}
	try {
		await db`
			INSERT INTO locations (id, label, latitude, longitude)
			VALUES (${TEST_LOC_ID}, 'Recorder Loc', 55.73, 9.62)
		`
	} catch {}
})

afterAll(async () => {
	try {
		await db`DELETE FROM trips WHERE vehicle_id = ${TEST_VID}`
	} catch {}
	try {
		await db`DELETE FROM vehicles WHERE id = ${TEST_VID}`
	} catch {}
	try {
		await db`DELETE FROM locations WHERE id = ${TEST_LOC_ID}`
	} catch {}
})

function makeOkResponse() {
	const baseHour =
		Math.floor(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000
	return [
		{
			hourly: {
				time: [
					new Date(baseHour - 3600_000).toISOString().replace(/\.000Z$/, "Z"),
					new Date(baseHour).toISOString().replace(/\.000Z$/, "Z"),
					new Date(baseHour + 3600_000).toISOString().replace(/\.000Z$/, "Z")
				],
				temperature_2m: [13.0, 13.5, 14.0],
				relative_humidity_2m: [80, 82, 85],
				precipitation: [0.0, 0.0, 0.0],
				wind_speed_10m: [7.0, 6.5, 6.0],
				wind_direction_10m: [240, 235, 230],
				weather_code: [0, 0, 0]
			}
		}
	]
}

let originalFetch: any

beforeEach(() => {
	originalFetch = globalThis.fetch
})

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe("recordWeather", () => {
	it("updates weather on sync success via createTrip", async () => {
		const mockFetch = async () =>
			new Response(JSON.stringify(makeOkResponse()), { status: 200 })
		globalThis.fetch = mockFetch as any

		const row = await tripsQueries.createTrip({
			vehicle_id: TEST_VID,
			start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
			end_time: new Date().toISOString(),
			daypart: "morning",
			duration_min: 45,
			distance_km: 15.0,
			start_location_id: TEST_LOC_ID,
			end_location_id: TEST_LOC_ID
		})

		expect(row.weather_start).not.toBeNull()
		expect(row.weather_end).not.toBeNull()

		await db`DELETE FROM trips WHERE id = ${row.id}`
	})

	it("leaves NULL weather when sync and retries all fail", async () => {
		const timeoutCallbacks: (() => void)[] = []
		const originalSetTimeout = globalThis.setTimeout

		const mockFetch = async () =>
			new Response("Server Error", { status: 500 })
		globalThis.fetch = mockFetch as any

		globalThis.setTimeout = ((fn: () => void, ms: number) => {
			timeoutCallbacks.push(fn)
			return 0 as any
		}) as any

		const row = await tripsQueries.createTrip({
			vehicle_id: TEST_VID,
			start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
			end_time: new Date().toISOString(),
			daypart: "morning",
			duration_min: 45,
			distance_km: 15.0,
			start_location_id: TEST_LOC_ID,
			end_location_id: TEST_LOC_ID
		})

		// Sync fetch failed, so returned row has null weather
		expect(row.weather_start).toBeNull()
		expect(row.weather_end).toBeNull()

		// Run scheduled retries (should be two: 5s and 30s)
		expect(timeoutCallbacks.length).toBeGreaterThanOrEqual(1)
		expect(timeoutCallbacks.length).toBeLessThanOrEqual(2)

		for (const cb of timeoutCallbacks) {
			await cb()
		}

		globalThis.setTimeout = originalSetTimeout as any

		const trips = await tripsQueries.findTripsByMonth({
			startUtc: new Date(Date.now() - 24 * 3600_000).toISOString(),
			endUtc: new Date(Date.now() + 1000).toISOString()
		})
		const updated = trips.find((t) => t.id === row.id)
		expect(updated).toBeDefined()
		expect(updated!.weather_start).toBeNull()
		expect(updated!.weather_end).toBeNull()

		await db`DELETE FROM trips WHERE id = ${row.id}`
	})
})
*/
