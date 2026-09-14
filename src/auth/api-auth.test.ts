import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { Hono } from "hono"
import { apiAuth } from "./api-auth"
import { refreshAllowlists } from "./allowlist"
import { clearIntrospectionCache } from "./introspect"
import { resetDiscoveryCache } from "./discovery"

let fetchMock: typeof globalThis.fetch | null = null

const DISCOVERY_BODY = {
	authorization_endpoint: "http://mock-idp:1080/authorize",
	token_endpoint: "http://mock-idp:1080/token",
	userinfo_endpoint: "http://mock-idp:1080/userinfo",
	issuer: "http://mock-idp:1080"
}

function mockFetchWithUserinfo(userinfoBody: unknown, status: number = 200): void {
	globalThis.fetch = (async (url: URL | string) => {
		const urlStr = url.toString()
		if (urlStr.includes(".well-known/openid-configuration")) {
			return new Response(JSON.stringify(DISCOVERY_BODY), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		}
		return new Response(JSON.stringify(userinfoBody), {
			status,
			headers: { "Content-Type": "application/json" }
		})
	}) as typeof globalThis.fetch
}

function createApp(): Hono {
	const app = new Hono()
	app.use("/protected/*", apiAuth)
	app.get("/protected/data", (c) => c.json({ ok: true }))
	app.get("/health", (c) => c.json({ status: "ok" }))
	return app
}

beforeEach(() => {
	process.env.ALLOWED_GOOGLE_EMAILS = "dgon@gmail.com"
	process.env.ALLOWED_SERVICE_ACCOUNTS = "importer@proj.iam.gserviceaccount.com"
	process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
	refreshAllowlists()
	clearIntrospectionCache()
	resetDiscoveryCache()
	fetchMock = globalThis.fetch
})

afterEach(() => {
	if (fetchMock) {
		globalThis.fetch = fetchMock
		fetchMock = null
	}
	resetDiscoveryCache()
})

describe("apiAuth middleware", () => {
	it("returns 401 when Authorization header is missing", async () => {
		const app = createApp()
		const res = await app.request("/protected/data")

		expect(res.status).toBe(401)
		const body = (await res.json()) as { title: string; detail: string }
		expect(body.title).toBe("Unauthorized")
		expect(body.detail).toBe("missing bearer token")
	})

	it("returns 401 when Authorization header has no Bearer prefix", async () => {
		const app = createApp()
		const res = await app.request("/protected/data", {
			headers: { Authorization: "Basic abc123" }
		})

		expect(res.status).toBe(401)
	})

	it("sets principal and serves request for valid user token", async () => {
		mockFetchWithUserinfo({ sub: "123", email: "dgon@gmail.com" })

		const app = createApp()
		const res = await app.request("/protected/data", {
			headers: { Authorization: "Bearer valid-user-token" }
		})

		expect(res.status).toBe(200)
		const body = (await res.json()) as { ok: boolean }
		expect(body.ok).toBe(true)
	})

	it("sets principal for valid service-account token", async () => {
		mockFetchWithUserinfo({ email: "importer@proj.iam.gserviceaccount.com" })

		const app = createApp()
		const res = await app.request("/protected/data", {
			headers: { Authorization: "Bearer valid-sa-token" }
		})

		expect(res.status).toBe(200)
	})

	it("returns 401 for invalid token", async () => {
		mockFetchWithUserinfo("Unauthorized", 401)

		const app = createApp()
		const res = await app.request("/protected/data", {
			headers: { Authorization: "Bearer bad-token" }
		})

		expect(res.status).toBe(401)
		expect(((await res.json()) as { detail: string }).detail).toBe("token rejected")
	})

	it("returns 403 for token not on allowlist", async () => {
		mockFetchWithUserinfo({ sub: "999", email: "stranger@gmail.com" })

		const app = createApp()
		const res = await app.request("/protected/data", {
			headers: { Authorization: "Bearer unlisted-token" }
		})

		expect(res.status).toBe(403)
	})

	it("allows /health without auth", async () => {
		const app = createApp()
		const res = await app.request("/health")

		expect(res.status).toBe(200)
		const body = (await res.json()) as { status: string }
		expect(body.status).toBe("ok")
	})
})