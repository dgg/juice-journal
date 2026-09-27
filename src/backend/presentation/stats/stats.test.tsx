import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { Hono } from "hono"

import { DbInstance } from "../../../fixture-setup"

import { TripDetailPills } from "../../../frontend/components/TripDetailPills"

const VEHICLE_ID = "vhcl_StatsTrip"
let tripId: string

describe("GET /stats/trips/:id", () => {
	beforeAll(async () => {
		await DbInstance.client`INSERT INTO vehicles (id, description) VALUES (${VEHICLE_ID}, ${"StatsTrip"})`
		const [{ id }] = await DbInstance.client`
			INSERT INTO trips (
				vehicle_id, start_time, end_time,
				start_location, end_location, daypart,
				duration, distance, speed, consumption, odometer
			)
			VALUES (
				${VEHICLE_ID},
				'2026-06-01T08:00:00Z', '2026-06-01T08:45:00Z',
				'home', 'work', 'morning',
				45, 15.0, 55.0, 18.5, 50000
			)
			RETURNING id
		`
		tripId = id
	})

	afterAll(async () => {
		await DbInstance.client`DELETE FROM trips WHERE vehicle_id = ${VEHICLE_ID}`
		await DbInstance.client`DELETE FROM vehicles WHERE id = ${VEHICLE_ID}`
	})

	const app = new Hono().get("/trips/:id", async (c) => {
		const { FindById } = await import("../../db/queries/trips/FindById")
		const trip = await new FindById(c.req.param("id")).execute()
		if (!trip) return c.notFound()
		return c.html(<TripDetailPills trip={trip} />)
	})

	it("returns 404 for nonexistent trip", async () => {
		const res = await app.request("/trips/nonexistent")
		expect(res.status).toBe(404)
	})

	it("FindById + TripDetailPills render pills HTML for seeded trip", async () => {
		const { FindById } = await import("../../db/queries/trips/FindById")
		const trip = await new FindById(tripId).execute(DbInstance.client)
		expect(trip).not.toBeNull()
		const html = String(<TripDetailPills trip={trip!} />)
		expect(html).toContain('class="trip-detail-pills"')
		expect(html).toContain("Distance")
		expect(html).toContain("Duration")
		expect(html).toContain("Route")
	})
})