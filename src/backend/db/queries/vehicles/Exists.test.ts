import { describe, it, expect } from "bun:test"

import { DbInstance } from "../../../../fixture-setup"

import { Exists } from "./Exists"

describe(Exists.name, () => {
	describe("non-existing vehicle", ()=>{
		it("false", async ()=> {
			const nonExistingId = ""
			const exists = await new Exists(nonExistingId).execute(DbInstance.client)
			expect(exists).toBeFalse()
		})
	})
	describe("default vehicle", () => {
		it("true", async () => {
			const ids: {id: string}[] = await DbInstance.client`SELECT id FROM vehicles WHERE description='commuter'`
			const id = ids[0]!.id

			const exists = await new Exists(id).execute(DbInstance.client)
			expect(exists).toBeTrue()
		})
	})
})
