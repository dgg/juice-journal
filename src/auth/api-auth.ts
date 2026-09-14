import type { MiddlewareHandler } from "hono"
import type { Env } from "../backend/utils/logger"
import { introspectToken, TokenRejectedError } from "./introspect"
import { isAuthorized } from "./allowlist"
import type { Principal } from "./types"

function unauthorized(detail: string) {
	return Response.json(
		{
			type: "about:blank",
			status: 401,
			title: "Unauthorized",
			detail
		},
		{
			status: 401,
			headers: { "Content-Type": "application/problem+json" }
		}
	)
}

export const apiAuth: MiddlewareHandler<Env> = async (c, next) => {
	const authHeader = c.req.header("Authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return unauthorized("missing bearer token")
	}

	const token = authHeader.slice("Bearer ".length).trim()
	if (!token) {
		return unauthorized("missing bearer token")
	}

	let result
	try {
		result = await introspectToken(token)
	} catch (err) {
		if (err instanceof TokenRejectedError) {
			return unauthorized("token rejected")
		}
		return unauthorized("token introspection failed")
	}

	if (!isAuthorized(result.email, result.isServiceAccount)) {
		return Response.json(
			{
				type: "about:blank",
				status: 403,
				title: "Forbidden",
				detail: "identity not authorized"
			},
			{
				status: 403,
				headers: { "Content-Type": "application/problem+json" }
			}
		)
	}

	const principal: Principal = {
		provider: "google",
		sub: result.sub,
		email: result.email,
		authMethod: "bearer",
		identityType: result.isServiceAccount ? "service-account" : "user"
	}
	c.set("principal", principal)
	await next()
}