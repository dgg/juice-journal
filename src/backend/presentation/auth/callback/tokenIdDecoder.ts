import { createMiddleware } from "hono/factory"

import { type TokenResponse, decodeIdToken } from "../oauth-callback"

import type { CallbackVars } from "./types"

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
