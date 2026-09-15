import { createMiddleware } from "hono/factory"

import { type TokenResponse } from "../oauth-callback"

import type { CallbackVars } from "./types"

export const verifyTokenId = createMiddleware<{ Variables: CallbackVars }>(
	async (c, next) => {
		const tokens: TokenResponse = c.get("tokens")
		if (!tokens.id_token) {
			return c.text("No id_token in token response", 500)
		}
		await next()
	}
)
