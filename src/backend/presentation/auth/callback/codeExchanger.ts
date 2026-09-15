import { createMiddleware } from "hono/factory"

import type { CallbackVars, TokenResponse } from "./types"

import { getOidcEndpoints } from "../../../auth/discovery"

export const ensureRedirectUri = (): string => {
	const uri = process.env.GOOGLE_WEB_REDIRECT_URI
	if (!uri) throw new Error("GOOGLE_WEB_REDIRECT_URI environment variable is not set")
	return uri
}

const exchangeCode = async (
	code: string,
	redirectUri: string
): Promise<TokenResponse> => {
	const clientId = process.env.GOOGLE_WEB_CLIENT_ID
	const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET

	if (!clientId) {
		throw new Error("GOOGLE_WEB_CLIENT_ID must be set")
	}

	const endpoints = await getOidcEndpoints()
	const tokenUrl = endpoints.token_endpoint

	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: clientId
	})

	if (clientSecret) {
		body.set("client_secret", clientSecret)
	}

	const response = await fetch(tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`token exchange failed: ${response.status} ${text}`)
	}

	return (await response.json()) as TokenResponse
}

export const exchangeQueryCode = createMiddleware<{ Variables: CallbackVars }>(
	async (c, next) => {
		const redirectUri = ensureRedirectUri()
		let tokens: TokenResponse
		try {
			tokens = await exchangeCode(c.req.query("code")!, redirectUri)
		} catch {
			return c.text("Token exchange failed", 500)
		}
		c.set("tokens", tokens)
		await next()
	}
)
