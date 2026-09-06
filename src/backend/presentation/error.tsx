import type { ErrorHandler } from "hono"
import type { Env } from "../utils/logger"

import { ErrorPage } from "../../frontend/pages/ErrorPage"

export const errorHandler: ErrorHandler<Env> = (err, c) => {
	c.var.logger.error({ err, method: c.req.method, path: c.req.path }, "unhandled error")
	if (c.req.header("HX-Request")) {
		return c.html(<ErrorPage />, 200)
	}
	return c.html(<ErrorPage />, 500)
}
