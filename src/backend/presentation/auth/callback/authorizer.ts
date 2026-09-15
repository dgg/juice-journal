import { createMiddleware } from "hono/factory"

import { type IdTokenPayload, type TokenResponse } from "../oauth-callback"

import type { CallbackVars } from "./types"
import { isAllowedUser } from "../../../auth/allowlist"

export const authorizeIdentity = createMiddleware<{ Variables: CallbackVars }>(
	async (c, next) => {
		const idPayload: IdTokenPayload = c.get("idPayload")
		if (!idPayload.email) {
			return c.text("id_token missing email claim", 500)
		}
		if (!isAllowedUser(idPayload.email)) {
			return c.text(`account '${idPayload.email}' not authorized`, 403)
		}
		await next()
	}
)
