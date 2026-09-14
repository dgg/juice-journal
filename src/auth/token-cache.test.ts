import { describe, it, expect, beforeEach } from "bun:test"
import { TokenCache } from "./token-cache"

describe("TokenCache", () => {
	let cache: TokenCache<string>

	beforeEach(() => {
		cache = new TokenCache<string>()
	})

	it("stores and retrieves a value", () => {
		cache.set("token-a", "result-a")
		expect(cache.get("token-a")).toBe("result-a")
	})

	it("returns undefined for missing key", () => {
		expect(cache.get("nonexistent")).toBeUndefined()
	})

	it("evicts a value", () => {
		cache.set("token-b", "result-b")
		cache.evict("token-b")
		expect(cache.get("token-b")).toBeUndefined()
	})

	it("expires entries after TTL", async () => {
		cache.set("token-c", "result-c", 50) // 50ms TTL
		expect(cache.get("token-c")).toBe("result-c")

		await new Promise((r) => setTimeout(r, 60))
		expect(cache.get("token-c")).toBeUndefined()
	})

	it("tracks size", () => {
		expect(cache.size).toBe(0)
		cache.set("t1", "r1")
		cache.set("t2", "r2")
		expect(cache.size).toBe(2)
	})

	it("clears all entries", () => {
		cache.set("t1", "r1")
		cache.set("t2", "r2")
		cache.clear()
		expect(cache.size).toBe(0)
	})
})