import type { ErrorHandler } from "hono"
import type {Env} from "../utils/logger"

import { ErrorPage } from "../../frontend/pages/ErrorPage"

export const errorHandler: ErrorHandler<Env> = (err, c) => {
		c.var.logger.fatal("GLOBAL")
		c.var.logger.error(
			{ err, method: c.req.method, path: c.req.path },
			"unhandled error"
		)
		return c.html(<ErrorPage />, 500)
	}
