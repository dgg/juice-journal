import { Hono } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import { randomBytes } from "crypto"
import type { Env } from "../backend/utils/logger"
import { COOKIE_NAME, signCookie, verifyCookie, MAX_AGE_SECONDS } from "./cookie"
import { isAllowedUser } from "./allowlist"
import { exchangeCode, decodeIdToken } from "./oauth-callback"
import { getOidcEndpoints } from "./discovery"
import { LoginPage } from "../frontend/pages/LoginPage"

const STATE_COOKIE_NAME = "jj_oauth_state"
const STATE_MAX_AGE_SECONDS = 300 // 5 minutes

function getRedirectUri(): string {
	const uri = process.env.GOOGLE_WEB_REDIRECT_URI
	if (!uri) throw new Error("GOOGLE_WEB_REDIRECT_URI environment variable is not set")
	return uri
}

function getClientId(): string {
	const id = process.env.GOOGLE_WEB_CLIENT_ID
	if (!id) throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is not set")
	return id
}

function signState(state: string): string {
	return signCookie({ provider: "google", email: state })
}

function verifyState(cookieValue: string): string | null {
	const payload = verifyCookie(cookieValue)
	return payload?.email ?? null
}

export const authRoutes = new Hono<Env>()

authRoutes.get("/login", (c) => c.html(<LoginPage />))

authRoutes.get("/google/start", async (c) => {
	const state = randomBytes(16).toString("hex")
	const endpoints = await getOidcEndpoints()
	const clientId = getClientId()
	const redirectUri = getRedirectUri()

	const authUrl = new URL(endpoints.authorization_endpoint)
	authUrl.searchParams.set("client_id", clientId)
	authUrl.searchParams.set("redirect_uri", redirectUri)
	authUrl.searchParams.set("response_type", "code")
	authUrl.searchParams.set("scope", "openid email profile")
	authUrl.searchParams.set("access_type", "offline")
	authUrl.searchParams.set("state", state)

	setCookie(c, STATE_COOKIE_NAME, signState(state), {
		httpOnly: true,
		sameSite: "Lax",
		maxAge: STATE_MAX_AGE_SECONDS,
		path: "/"
	})
	return c.redirect(authUrl.toString())
})

authRoutes.get("/google/callback", async (c) => {
	const code = c.req.query("code")
	const state = c.req.query("state")
	const stateCookie = getCookie(c, STATE_COOKIE_NAME)

	if (!code || !state || !stateCookie) {
		return c.text("Missing authorization parameters", 400)
	}

	const expectedState = verifyState(stateCookie)
	if (!expectedState || expectedState !== state) {
		return c.text("State mismatch", 400)
	}

	deleteCookie(c, STATE_COOKIE_NAME, { path: "/" })

	const redirectUri = getRedirectUri()
	let tokens
	try {
		tokens = await exchangeCode(code, redirectUri)
	} catch {
		return c.text("Token exchange failed", 500)
	}

	if (!tokens.id_token) {
		return c.text("No id_token in token response", 500)
	}

	let idPayload
	try {
		idPayload = decodeIdToken(tokens.id_token)
	} catch {
		return c.text("Failed to decode id_token", 500)
	}

	if (!idPayload.email) {
		return c.text("id_token missing email claim", 500)
	}

	console.log(idPayload)
	if (!isAllowedUser(idPayload.email)) {
		return c.text("Account not authorized", 403)
	}

	const sessionCookie = signCookie({
		provider: "google",
		sub: idPayload.sub,
		email: idPayload.email
	})

	setCookie(c, COOKIE_NAME, sessionCookie, {
		httpOnly: true,
		sameSite: "Lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: MAX_AGE_SECONDS,
		path: "/"
	})
	return c.redirect("/")
})

authRoutes.get("/logout", (c) => {
	deleteCookie(c, COOKIE_NAME, {
		httpOnly: true,
		sameSite: "Lax",
		secure: process.env.NODE_ENV === "production",
		path: "/"
	})
	return c.redirect("/auth/login")
})
