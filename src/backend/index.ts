import { Hono } from "hono"
import { problemDetailsHandler } from "hono-problem-details"
import { creationHandler, getTrips } from "./handlers"
import {
	endLocationValidator,
	creationValidator,
	startLocationValidator,
	vehicleValidator,
	tripConflictValidator
} from "./validators"

const app = new Hono()

const PORT = process.env.PORT || 3000

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

console.log(`Server listening on port ${PORT}`)

export default {
	port: PORT,
	fetch: app.fetch
}
