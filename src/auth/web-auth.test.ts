import { describe, it, expect, beforeEach } from "bun:test"
import { Hono } from "hono"
import { webAuth } from "./web-auth"
import { signCookie } from "./cookie"
import { refreshAllowlists } from "./allowlist"

const TEST_SECRET = "test-secret-key-for-tests"

function createApp(): Hono {
	const app = new Hono()
	app.use("/*", webAuth)
	app.get("/", (c) => c.text("protected page"))
	return app
}

beforeEach(() => {
	process.env.ALLOWED_GOOGLE_EMAILS = "dgon@gmail.com"
	process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
	process.env.JJ_SECRET = TEST_SECRET
	refreshAllowlists()
})

describe("webAuth middleware", () => {
	it("redirects to /auth/login when no cookie present", async () => {
		const app = createApp()
		const res = await app.request("/")

		expect(res.status).toBe(302)
		expect(res.headers.get("Location")).toBe("/auth/login")
	})

	it("serves page when valid cookie present", async () => {
		const app = createApp()
		const cookie = signCookie(
			{ provider: "google", sub: "123", email: "dgon@gmail.com" },
			TEST_SECRET
		)

		const res = await app.request("/", {
			headers: { Cookie: `jj_session=${cookie}` }
		})

		expect(res.status).toBe(200)
		expect(await res.text()).toBe("protected page")
	})

	it("redirects when cookie is tampered", async () => {
		const app = createApp()
		const cookie = signCookie(
			{ provider: "google", email: "dgon@gmail.com" },
			TEST_SECRET
		)
		const tampered = cookie.slice(0, -2) + "xx"

		const res = await app.request("/", {
			headers: { Cookie: `jj_session=${tampered}` }
		})

		expect(res.status).toBe(302)
		expect(res.headers.get("Location")).toBe("/auth/login")
	})

	it("redirects when cookie is expired", async () => {
		const app = createApp()
		const expiredPayload = {
			provider: "google",
			email: "dgon@gmail.com",
			exp: Math.floor(Date.now() / 1000) - 100
		}
		const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url")
		const { createHmac } = require("crypto")
		const sig = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url")

		const res = await app.request("/", {
			headers: { Cookie: `jj_session=${encoded}.${sig}` }
		})

		expect(res.status).toBe(302)
		expect(res.headers.get("Location")).toBe("/auth/login")
	})

	it("redirects when email not on allowlist", async () => {
		const app = createApp()
		const cookie = signCookie(
			{ provider: "google", email: "stranger@gmail.com" },
			TEST_SECRET
		)

		const res = await app.request("/", {
			headers: { Cookie: `jj_session=${cookie}` }
		})

		expect(res.status).toBe(302)
		expect(res.headers.get("Location")).toBe("/auth/login")
	})
})