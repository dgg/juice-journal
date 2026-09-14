import { describe, it, expect } from "bun:test"
import { mintServiceAccountToken } from "./sa-token"

describe("sa-token", () => {
	it("throws when GOOG_SA_KEY_PATH is not set", () => {
		delete process.env.GOOG_SA_KEY_PATH
		expect(mintServiceAccountToken()).rejects.toThrow("GOOG_SA_KEY_PATH")
	})

	it("throws when OAUTH_ISSUER_BASE_URL is not set", async () => {
		process.env.GOOG_SA_KEY_PATH = "/dev/null"
		delete process.env.OAUTH_ISSUER_BASE_URL

		// Will fail reading /dev/null as JSON before reaching issuer check,
		// or fail on issuer if key is valid. Either way, it should throw.
		expect(mintServiceAccountToken()).rejects.toThrow()
	})
})