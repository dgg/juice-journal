import type { MiddlewareHandler } from "hono"
import { getCookie } from "hono/cookie"
import type { Env } from "../../utils/logger"
import { COOKIE_NAME, verifyCookie } from "./cookie"
import { isAllowedUser } from "../../auth/allowlist"
import type { Principal } from "../../auth/types"

export const webAuth: MiddlewareHandler<Env> = async (c, next) => {
	const cookie = getCookie(c, COOKIE_NAME)
	if (!cookie) {
		return c.redirect("/auth/login")
	}

	const payload = verifyCookie(cookie)
	if (!payload) {
		return c.redirect("/auth/login")
	}

	if (!isAllowedUser(payload.email)) {
		return c.redirect("/auth/login")
	}

	const principal: Principal = {
		provider: payload.provider,
		sub: payload.sub,
		email: payload.email,
		authMethod: "session-cookie",
		identityType: "user"
	}
	c.set("principal", principal)
	await next()
}