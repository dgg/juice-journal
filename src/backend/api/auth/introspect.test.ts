import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { introspectToken, clearIntrospectionCache, TokenRejectedError } from "./introspect"
import { resetDiscoveryCache } from "../../auth/discovery"

const ORIGINAL_ISSUER = process.env.OAUTH_ISSUER_BASE_URL
const ORIGINAL_FETCH = globalThis.fetch

const DISCOVERY_BODY = {
	authorization_endpoint: "http://mock-idp:1080/authorize",
	token_endpoint: "http://mock-idp:1080/token",
	userinfo_endpoint: "http://mock-idp:1080/userinfo",
	issuer: "http://mock-idp:1080"
}

beforeEach(() => {
	clearIntrospectionCache()
	resetDiscoveryCache()
})

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH
	process.env.OAUTH_ISSUER_BASE_URL = ORIGINAL_ISSUER
	resetDiscoveryCache()
})

function mockFetch(userinfoResponse: { status: number; body: unknown }): {
	calls: { url: string; authHeader: string | null }[]
} {
	const calls: { url: string; authHeader: string | null }[] = []
	globalThis.fetch = (async (url: URL | string, opts?: RequestInit) => {
		const urlStr = url.toString()
		const headers = opts?.headers as Record<string, string> | undefined
		calls.push({
			url: urlStr,
			authHeader: headers?.Authorization ?? null
		})

		if (urlStr.includes(".well-known/openid-configuration")) {
			return new Response(JSON.stringify(DISCOVERY_BODY), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		}

		return new Response(JSON.stringify(userinfoResponse.body), {
			status: userinfoResponse.status,
			headers: { "Content-Type": "application/json" }
		})
	}) as typeof globalThis.fetch
	return { calls }
}

describe("introspectToken", () => {
	it("calls userinfo endpoint with Bearer token and returns identity", async () => {
		process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
		const { calls } = mockFetch({
			status: 200,
			body: { sub: "1234567890", email: "dgon@gmail.com", email_verified: true }
		})

		const result = await introspectToken("opaque-token-123")

		expect(result.email).toBe("dgon@gmail.com")
		expect(result.sub).toBe("1234567890")
		expect(result.isServiceAccount).toBe(false)

		const userinfoCall = calls.find((c) => !c.url.includes(".well-known"))
		expect(userinfoCall?.url).toBe("http://mock-idp:1080/userinfo")
		expect(userinfoCall?.authHeader).toBe("Bearer opaque-token-123")
	})

	it("detects service-account emails", async () => {
		process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
		mockFetch({
			status: 200,
			body: { email: "importer@proj.iam.gserviceaccount.com" }
		})

		const result = await introspectToken("sa-token")
		expect(result.isServiceAccount).toBe(true)
	})

	it("caches result — second call does not fetch userinfo", async () => {
		process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
		const { calls } = mockFetch({
			status: 200,
			body: { sub: "1", email: "user@test.com" }
		})

		await introspectToken("cached-token")
		await introspectToken("cached-token")

		const userinfoCalls = calls.filter((c) => !c.url.includes(".well-known"))
		expect(userinfoCalls.length).toBe(1)
	})

	it("throws TokenRejectedError on non-200 response", async () => {
		process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
		mockFetch({ status: 401, body: "Unauthorized" })

		expect(introspectToken("bad-token")).rejects.toThrow(TokenRejectedError)
	})

	it("throws when email is missing from response", async () => {
		process.env.OAUTH_ISSUER_BASE_URL = "http://mock-idp:1080"
		mockFetch({ status: 200, body: { sub: "1" } })

		expect(introspectToken("no-email-token")).rejects.toThrow("missing email")
	})
})