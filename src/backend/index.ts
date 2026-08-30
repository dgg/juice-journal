import { Hono } from "hono"
import { requestId } from "hono/request-id"
import { structuredLogger } from "@hono/structured-logger"
import { problemDetailsHandler } from "hono-problem-details"
import { rootLogger, type Env } from "./utils/logger.ts"

import { apiTrips } from "./api/trips.ts"

import { homeDomain } from "./presentation/home.tsx"
import { tripsDomain } from "./presentation/trips.tsx"
import { statsDomain } from "./presentation/stats.tsx"
import { summaryDomain } from "./presentation/summary.tsx"

const app = new Hono<Env>()

const PORT = process.env.PORT || 3000

app.use(requestId())
app.use(
	structuredLogger({
		createLogger: (c) => rootLogger.child({ requestId: c.var.requestId }),
		onResponse: (logger, c, elapsedMs) => {
			logger.info({ method: c.req.method, path: c.req.path, elapsedMs })
		}
	})
)

app.onError(
	problemDetailsHandler({
		autoInstance: true,
		includeStack: process.env.NODE_ENV !== "production",
		defaultType: "about:blank"
	})
)

app
	// api handlers
	.route("/api", apiTrips)
	// htmx handlers
	.route("/", homeDomain)
	.route("/trips", tripsDomain)
	.route("/stats", statsDomain)
	.route("/summary", summaryDomain)

app.get("/static/*", async (c) => {
	const path = c.req.path.replace(/^\/static\//, "")
	const file = Bun.file(`./public/${path}`)
	if (!(await file.exists())) return c.notFound()
	return new Response(file)
})

rootLogger.info({ port: PORT }, "Server listening on port")

export default {
	port: PORT,
	hostname: "0.0.0.0",
	fetch: app.fetch
}
