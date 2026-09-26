import { Hono } from "hono"

import type { TripsEnv } from "./types"

import { buildTripFormProps } from "./formProps"

import { TripFormPage } from "../../../frontend/pages/TripFormPage"

import { formSchemaValidator } from "./formSchemaValidator"
import { formConsistencyCheck } from "./formConsistencyCheck"

import { webAuth } from "../auth/web-auth"
import { Insert } from "../../db/queries/trips/Insert"

export const tripsDomain = new Hono<TripsEnv>()
	.use(webAuth)
	// load initial data
	.get("/creation", async (c) =>
		c.html(<TripFormPage {...await buildTripFormProps()} />)
	)
	// handle form post
	.post("/", formSchemaValidator, formConsistencyCheck, async (c) => {
		await new Insert(c.var.form).execute()
		if (c.req.header("HX-Request")) {
			c.header("HX-Redirect", "/")
			return c.text("", 200)
		}
		return c.redirect("/")
	})
