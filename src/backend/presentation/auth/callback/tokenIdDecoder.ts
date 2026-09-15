import { createMiddleware } from "hono/factory"

import type { CallbackVars, IdTokenPayload, TokenResponse } from "./types"

const decodeIdToken = (idToken: string): IdTokenPayload => {
	const parts = idToken.split(".")
	if (parts.length < 2) {
		throw new Error("invalid id_token: expected JWT with 3 parts")
	}
	const payloadB64 = parts[1]!
	const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/")
	const decoded = Buffer.from(padded, "base64").toString("utf-8")
	return JSON.parse(decoded) as IdTokenPayload
}

export const decodeTokenId = createMiddleware<{ Variables: CallbackVars }>(
	async (c, next) => {
		const tokens: TokenResponse = c.get("tokens")
		try {
			// id_token verified in previous middleware
			const idPayload = decodeIdToken(tokens.id_token!)
			c.set("idPayload", idPayload)
		} catch {
			return c.text("Failed to decode id_token", 500)
		}
		await next()
	}
)
