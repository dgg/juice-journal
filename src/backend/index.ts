import { Hono } from "hono"
import { createTrip, getTrips } from "./handlers"

const app = new Hono()

const PORT = process.env.PORT || 3000

app.get("/api/health", (c) => c.json({ status: "ok" }))
	// Trips routes
	.post("/api/trips", createTrip)
	.get("/api/trips", getTrips)

console.log(`Server listening on port ${PORT}`)

export default {
	port: PORT,
	fetch: app.fetch
}
