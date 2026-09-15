import { createMiddleware } from "hono/factory"
import type { CallbackVars } from "./types"
import { exchangeCode, type TokenResponse } from "../oauth-callback"

export const ensureRedirectUri = (): string => {
	const uri = process.env.GOOGLE_WEB_REDIRECT_URI
	if (!uri) throw new Error("GOOGLE_WEB_REDIRECT_URI environment variable is not set")
	return uri
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


