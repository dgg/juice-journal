import { describe, it, expect, beforeAll, afterAll } from "bun:test"

import { DbInstance } from "../../../../fixture-setup"
import { FindAll } from "./FindAll"
import type { VehicleRow } from "../vehicles/VehicleRow"

const VEHICLE_A = "testveh_findall_A"
const VEHICLE_B = "testveh_findall_B"
const VEHICLE_C = "testveh_findall_C"

async function seedVehicle(id: string, description: string) {
	const db = DbInstance.client
	await db`INSERT INTO vehicles (id, description) VALUES (${id}, ${description})`
}

describe(FindAll.name, () => {
	describe("default vehicle", () => {
		it("commuter", async () => {
			const results = await new FindAll().execute(DbInstance.client)
			expect(results).toHaveLength(1)
			expect(results[0]?.description).toEqual("commuter")
		})

		describe("more vehicles", () => {
			const A: VehicleRow = { description: "A", id: VEHICLE_A }
			const B: VehicleRow = { description: "B", id: VEHICLE_B }
			const C: VehicleRow = { description: "C", id: VEHICLE_C }

			beforeAll(async () => {
				await seedVehicle(B.id, B.description)
				await seedVehicle(A.id, A.description)
				await seedVehicle(C.id, C.description)
			})

			afterAll(async () => {
				const db = DbInstance.client
				await db`DELETE FROM vehicles WHERE id IN (${VEHICLE_A}, ${VEHICLE_B}, ${VEHICLE_C})`
			})

			it("all vehicles ordered by description", async () => {
				const results = await new FindAll().execute(DbInstance.client)
				expect(results).toHaveLength(4)
				expect(results[0]?.description).toEqual(A.description)
				expect(results[1]?.description).toEqual(B.description)
				expect(results[2]?.description).toEqual(C.description)
				expect(results[3]?.description).toEqual("commuter")
			})
		})
	})

	describe("No vehicles", () => {
		beforeAll(async () => {
			await DbInstance.client`DELETE FROM vehicles`
		})

		afterAll(async () => {
			const db = DbInstance.client
			await db`INSERT INTO vehicles (description) VALUES ('commuter')`
		})

		it("empty array", async () => {
			const results = await new FindAll().execute(DbInstance.client)
			expect(results).toEqual([])
		})
	})
})
