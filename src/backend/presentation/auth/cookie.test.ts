import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { signCookie, verifyCookie } from "./cookie"

const TEST_SECRET = "test-secret-key-for-tests"

describe("cookie", () => {
	describe("signCookie / verifyCookie round-trip", () => {
		it("signs and verifies a valid payload", () => {
			const cookie = signCookie(
				{ provider: "google", sub: "123", email: "user@example.com" },
				TEST_SECRET
			)
			const payload = verifyCookie(cookie, TEST_SECRET)

			expect(payload).not.toBeNull()
			expect(payload!.provider).toBe("google")
			expect(payload!.sub).toBe("123")
			expect(payload!.email).toBe("user@example.com")
			expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
		})

		it("rejects tampered payload", () => {
			const cookie = signCookie(
				{ provider: "google", email: "user@example.com" },
				TEST_SECRET
			)
			const [encoded, sig] = [cookie.slice(0, cookie.lastIndexOf(".")), cookie.slice(cookie.lastIndexOf(".") + 1)]

			// Flip a character in the encoded payload
			const tampered = encoded.slice(0, -1) + (encoded.slice(-1) === "a" ? "b" : "a") + "." + sig
			const payload = verifyCookie(tampered, TEST_SECRET)

			expect(payload).toBeNull()
		})

		it("rejects expired cookie", () => {
			const cookie = signCookie(
				{ provider: "google", email: "user@example.com" },
				TEST_SECRET
			)
			// Manually construct an expired cookie
			const expiredPayload = {
				provider: "google",
				email: "user@example.com",
				exp: Math.floor(Date.now() / 1000) - 100
			}
			const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url")
			const { createHmac } = require("crypto")
			const sig = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url")
			const expiredCookie = `${encoded}.${sig}`

			const payload = verifyCookie(expiredCookie, TEST_SECRET)
			expect(payload).toBeNull()
		})

		it("rejects cookie signed with wrong secret", () => {
			const cookie = signCookie(
				{ provider: "google", email: "user@example.com" },
				TEST_SECRET
			)
			const payload = verifyCookie(cookie, "wrong-secret")
			expect(payload).toBeNull()
		})

		it("rejects malformed cookie without dot", () => {
			const payload = verifyCookie("nodothere", TEST_SECRET)
			expect(payload).toBeNull()
		})
	})
})