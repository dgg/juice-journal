import { beforeAll, afterAll } from "bun:test"

import { TestDb } from "./TestDb"

export let DbInstance: TestDb

beforeAll(
	async () => {
		DbInstance = await TestDb.start()
	},
	{ timeout: 10_000 } // extended timeout
)

afterAll(async () => {
	await DbInstance?.stop()
})
