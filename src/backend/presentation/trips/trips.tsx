import { Hono } from "hono"

import { tripsQueries } from "../../db/queries/trips"

import type { TripsEnv } from "../types"

import { buildTripFormProps } from "./formProps"

import { TripFormPage } from "../../../frontend/pages/TripFormPage"

import { formSchemaValidator } from "./formSchemaValidator"
import { formConsistencyCheck } from "./formConsistencyCheck"

export const tripsDomain = new Hono<TripsEnv>()
	// load initial data
	.get("/creation", async (c) =>
		c.html(<TripFormPage {...await buildTripFormProps()} />)
	)
	// handle form post
	.post("/", formSchemaValidator, formConsistencyCheck, async (c) => {
		await tripsQueries.createTrip(c.var.form)
		if (c.req.header("HX-Request")) {
			c.header("HX-Redirect", "/")
			return c.text("", 200)
		}
		return c.redirect("/")
	})
