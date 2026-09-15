import { Hono } from "hono"
import { setCookie, deleteCookie } from "hono/cookie"
import { validator } from "hono/validator"
import { zValidator } from "@hono/zod-validator"
import { randomBytes } from "crypto"

import {
	COOKIE_NAME,
	signCookie,
	verifyCookie,
	MAX_AGE_SECONDS,
	STATE_COOKIE_NAME
} from "./cookie"

import { getOidcEndpoints } from "../../auth/discovery"

import { LoginPage } from "../../../frontend/pages/LoginPage"

import { authorizeIdentity } from "./callback/authorizer"
import {
	callbackCookiesSchema,
	callbackQuerySchema,
	type CallbackCookies
} from "./callback/callbackValidator"
import { ensureRedirectUri, exchangeQueryCode } from "./callback/codeExchanger"
import { decodeTokenId } from "./callback/tokenIdDecoder"
import { verifyTokenId } from "./callback/tokenIdVerifier"
import type { CallbackVars } from "./callback/types"

const STATE_MAX_AGE_SECONDS = 300 // 5 minutes

const ensureClientId = (): string => {
	const id = process.env.GOOGLE_WEB_CLIENT_ID
	if (!id) throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is not set")
	return id
}

const signState = (state: string): string =>
	signCookie({ provider: "google", email: state })

const verifyState = (cookieValue: string): string | null => {
	const payload = verifyCookie(cookieValue)
	return payload?.email ?? null
}

const buildAuthUrl = async (state: string): Promise<URL> => {
	const endpoints = await getOidcEndpoints()
	const clientId = ensureClientId()
	const redirectUri = ensureRedirectUri()

	const authUrl = new URL(endpoints.authorization_endpoint)
	authUrl.searchParams.set("client_id", clientId)
	authUrl.searchParams.set("redirect_uri", redirectUri)
	authUrl.searchParams.set("response_type", "code")
	authUrl.searchParams.set("scope", "openid email profile")
	authUrl.searchParams.set("access_type", "offline")
	authUrl.searchParams.set("state", state)

	return authUrl
}

type AuthEnv = {
	Variables: CallbackVars
}

export const authRoutes = new Hono<AuthEnv>()
	.get("/login", (c) => c.html(<LoginPage />))
	.get("/google/start", async (c) => {
		const state = randomBytes(16).toString("hex")
		setCookie(c, STATE_COOKIE_NAME, signState(state), {
			httpOnly: true,
			sameSite: "Lax",
			maxAge: STATE_MAX_AGE_SECONDS,
			path: "/"
		})
		const authUrl: URL = await buildAuthUrl(state)
		return c.redirect(authUrl.toString())
	})
	.get(
		"/google/callback",
		zValidator("query", callbackQuerySchema),
		zValidator("cookie", callbackCookiesSchema),
		validator("cookie", (v, c) => {
			const cookies = v as CallbackCookies
			const expectedState = verifyState(cookies.jj_oauth_state)
			if (expectedState !== c.req.query("state")) {
				return c.text("State mismatch", 400)
			}
			return v
		}),
		exchangeQueryCode,
		verifyTokenId,
		decodeTokenId,
		authorizeIdentity,
		async (c) => {
			deleteCookie(c, STATE_COOKIE_NAME, { path: "/" })
			const idPayload = c.get("idPayload")
			const sessionCookie = signCookie({
				provider: "google",
				sub: idPayload.sub,
				email: idPayload.email!
			})

			setCookie(c, COOKIE_NAME, sessionCookie, {
				httpOnly: true,
				sameSite: "Lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: MAX_AGE_SECONDS,
				path: "/"
			})
			return c.redirect("/")
		}
	)
	.get("/logout", (c) => {
		deleteCookie(c, COOKIE_NAME, {
			httpOnly: true,
			sameSite: "Lax",
			secure: process.env.NODE_ENV === "production",
			path: "/"
		})
		return c.redirect("/auth/login")
	})
