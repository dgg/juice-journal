import { Hono } from "hono"
import { requestId } from "hono/request-id"
import { structuredLogger } from "@hono/structured-logger"
import { problemDetailsHandler } from "hono-problem-details"
import { rootLogger, type Env } from "./utils/logger.ts"

import { apiTrips } from "./api/trips.ts"

import { homeHandler } from "./home.tsx"
import { statsHandler, getPartialTripStats } from "./stats.tsx"
import {
	getTripFormPage,
	getPartialTrips,
	getPartialStats,
	htmlCreationHandler
} from "./html-handlers.tsx"

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

app.get("/static/*", async (c) => {
	const path = c.req.path.replace(/^\/static\//, "")
	const file = Bun.file(`./public/${path}`)
	if (!(await file.exists())) return c.notFound()
	return new Response(file)
})

app.route("/api", apiTrips)
	// htmx handlers
	.get("/", homeHandler)
	.get("/trips/new", getTripFormPage)
	.get("/partials/trips", getPartialTrips)
	.get("/partials/stats", getPartialStats)
	.get("/partials/trip-stats", getPartialTripStats)
	.get("/stats", statsHandler)
	.post("/trips", htmlCreationHandler)

rootLogger.info({ port: PORT }, "Server listening on port")

export default {
	port: PORT,
	hostname: "0.0.0.0",
	fetch: app.fetch
}
