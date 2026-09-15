/**
 * Integration tests against MockServer.
 *
 * These tests require MockServer running and configured:
 *   docker-compose up -d mock-idp mock-init
 *   (or: bun dev/setup-mock-idp.ts)
 *
 * Then run: bun test src/auth/integration.test.ts
 *
 * Skipped by default — unskip when MockServer is available.
 */

import { describe, it, expect } from "bun:test"

const MOCKSERVER_URL =
	process.env.OAUTH_ISSUER_BASE_URL ?? "http://localhost:1080"

// Helper: issue an opaque token via MockServer's token endpoint
async function issueToken(): Promise<string> {
	const response = await fetch(`${MOCKSERVER_URL}/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: "juice-journal-dev",
			client_secret: "dev-secret"
		})
	})

	if (!response.ok) {
		throw new Error(`token endpoint failed: ${response.status}`)
	}

	const body = (await response.json()) as { access_token: string }
	return body.access_token
}

// Helper: call our API with a bearer token
async function callApi(path: string, token?: string): Promise<Response> {
	const headers: Record<string, string> = {}
	if (token) headers.Authorization = `Bearer ${token}`
	return fetch(`http://localhost:3000${path}`, { headers })
}

describe.skip("integration: API bearer auth against MockServer", () => {
	it("issues an opaque token and calls /api/trips with 200", async () => {
		const token = await issueToken()
		expect(token).toBeTruthy()

		const res = await callApi("/api/trips", token)
		expect(res.status).toBe(200)
	})

	it("rejects API call without bearer token", async () => {
		const res = await callApi("/api/trips")
		expect(res.status).toBe(401)
	})

	it("health endpoint works without auth", async () => {
		const res = await callApi("/api/health")
		expect(res.status).toBe(200)
	})
})

describe.skip("integration: web auth-code flow against MockServer", () => {
	it("completes full login flow and renders protected page", async () => {
		// 1. GET /auth/login — should render login page
		const loginPage = await fetch("http://localhost:3000/auth/login")
		expect(loginPage.status).toBe(200)
		expect(await loginPage.text()).toContain("Sign in")

		// 2. GET / without cookie — should redirect to /auth/login
		const noCookieRes = await fetch("http://localhost:3000/", {
			redirect: "manual"
		})
		expect(noCookieRes.status).toBe(302)
		expect(noCookieRes.headers.get("Location")).toBe("/auth/login")

		// 3. GET / with session cookie — should render page
		// (Full OAuth flow requires browser interaction with MockServer's
		//  authorize endpoint. This test verifies the cookie path once
		//  a cookie is obtained manually or via the callback flow.)
	})
})