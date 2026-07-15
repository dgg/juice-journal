import { Hono } from "hono"
import { requestId } from "hono/request-id"
import { structuredLogger } from "@hono/structured-logger"
import { problemDetailsHandler } from "hono-problem-details"
import { rootLogger, type Env } from "../utils/logger"
import { creationHandler, getTrips } from "./handlers"
import {
	endLocationValidator,
	creationValidator,
	startLocationValidator,
	vehicleValidator,
	tripConflictValidator
} from "./validators"

const app = new Hono<Env>()

const PORT = process.env.PORT || 3000

app.use(requestId())
app.use(
	structuredLogger({
		createLogger: (c) => rootLogger.child({ requestId: c.var.requestId })
	})
)

app.onError(
	problemDetailsHandler({
		autoInstance: true,
		includeStack: process.env.NODE_ENV !== "production",
		defaultType: "about:blank"
	})
)

app.get("/api/health", (c) => c.json({ status: "ok" }))
	// Trips routes
	.post(
		"/api/trips",
		creationValidator,
		endLocationValidator,
		startLocationValidator,
		vehicleValidator,
		tripConflictValidator,
		creationHandler
	)
	.get("/api/trips", getTrips)

rootLogger.info({ port: PORT }, "Server listening on port")

export default {
	port: PORT,
	fetch: app.fetch
}
