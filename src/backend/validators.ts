import { db } from "../db/client"
import type { Context, Next } from "hono"
import { validator } from "hono/validator"

import { zValidator } from "@hono/zod-validator"
import { tripInputSchema, type TripInput } from "./types"

export const creationValidator = zValidator(
	"json",
	tripInputSchema,
	(result, c: Context) => {
		if (!result.success) {
			return c.json(
				{ error: "Validation failed", details: result.error.issues },
				400
			)
		}
	}
)

export const vehicleValidator = validator(
	"json",
	async (req: TripInput, c: Context) => {
		try {
			const existing = await db`
				SELECT id FROM vehicles WHERE id = ${req.vehicle_id as string}
			`
			if (existing.length === 0) {
				return c.json(
					{
						path: ["vehicle_id"],
						message: `'${req.vehicle_id}' does not exist`
					},
					400
				)
			} else {
				return req
			}
		} catch {
			return c.json(
				{
					path: ["vehicle_id"],
					message: `Could not verify existence of '${req.vehicle_id}`
				},
				400
			)
		}
	}
)

export const startLocationValidator = validator("json", async (req: TripInput, c: Context) => {
	if (!req.start_location_id) {
		return req
	}
	try {
		const existing = await db`
				SELECT id FROM vehicles WHERE id = ${req.start_location_id as string}
			`
		if (existing.length === 0) {
			return c.json(
				{
					path: ["start_location_id"],
					message: `'${req.start_location_id}' does not exist`
				},
				400
			)
		} else {
			return req
		}
	} catch {
		return c.json(
			{
				path: ["start_location_id"],
				message: `Could not verify existence of '${req.start_location_id}`
			},
			400
		)
	}
})

export const endLocationValidator = validator(
	"json",
	async (req: TripInput, c: Context) => {
		if (!req.end_location_id) {
			return req
		}
		try {
			const existing = await db`
				SELECT id FROM vehicles WHERE id = ${req.end_location_id as string}
			`
			if (existing.length === 0) {
				return c.json(
					{
						path: ["end_location_id"],
						message: `'${req.end_location_id}' does not exist`
					},
					400
				)
			} else {
				return req
			}
		} catch {
			return c.json(
				{
					path: ["end_location_id"],
					message: `Could not verify existence of '${req.end_location_id}`
				},
				400
			)
		}
	}
)
