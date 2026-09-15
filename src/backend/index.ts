import { Hono } from "hono"
import { requestId } from "hono/request-id"
import { structuredLogger } from "@hono/structured-logger"
import { rootLogger, type Env } from "./utils/logger.ts"

import { apiTrips } from "./api/trips.ts"

import { homeDomain } from "./presentation/home/home.tsx"
import { tripsDomain } from "./presentation/trips/trips.tsx"
import { statsDomain } from "./presentation/stats/stats.tsx"

import { errorHandler } from "./presentation/error.tsx"

import { authRoutes } from "./presentation/auth/auth-routes.tsx"

const app = new Hono<Env>()

const PORT = process.env.PORT || 3000

app.use(requestId())
app.use(
	structuredLogger({
		createLogger: (c) => rootLogger.child({ requestId: c.var.requestId }),
		onResponse: (logger, c, elapsedMs) => {
			if (c.req.path === "/api/health") return
			logger.info({ method: c.req.method, path: c.req.path, elapsedMs })
		}
	})
)

app.onError(errorHandler)

app
	// auth routes (not behind any auth middleware)
	.route("/auth", authRoutes)
	// api handlers
	.route("/api", apiTrips)
	// htmx handlers
	.route("/", homeDomain)
	.route("/trips", tripsDomain)
	.route("/stats", statsDomain)

app.get("/static/*", async (c) => {
	const path = c.req.path.replace(/^\/static\//, "")
	const file = Bun.file(`./public/${path}`)
	console.log(file, await file.exists())
	if (!(await file.exists())) return c.notFound()
	return new Response(file)
})

rootLogger.info({ port: PORT }, "Server listening on port")

export default {
	port: PORT,
	hostname: "0.0.0.0",
	fetch: app.fetch
}
