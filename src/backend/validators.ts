import { db } from "../db/client"
import type { Context, Next } from "hono"
import { validator } from "hono/validator"

import { zValidator } from "@hono/zod-validator"
import { zodProblemHook } from "hono-problem-details/zod"
import { tripInputSchema, type TripInput } from "./types"
import { problems } from "./problems"

export const creationValidator = zValidator("json", tripInputSchema, zodProblemHook())

export const vehicleValidator = validator("json", async (req: TripInput, c: Context) => {
	try {
		const existing = await db`
				SELECT id FROM vehicles WHERE id = ${req.vehicle_id as string}
			`
		if (existing.length === 0) {
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Vehicle '${req.vehicle_id}' does not exist`,
				extensions: {
					errors: [{ field: "vehicle_id", message: "vehicle does not exist" }]
				}
			})
		} else {
			return req
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes("type")) {
			throw error
		}
		throw problems.create("FOREIGN_KEY_VIOLATION", {
			detail: `Could not verify vehicle '${req.vehicle_id}'`,
			extensions: {
				errors: [{ field: "vehicle_id", message: "verification failed" }]
			}
		})
	}
})

export const startLocationValidator = validator(
	"json",
	async (req: TripInput, c: Context) => {
		if (!req.start_location_id) {
			return req
		}
		try {
			const existing = await db`
				SELECT id FROM vehicles WHERE id = ${req.start_location_id as string}
			`
			if (existing.length === 0) {
				throw problems.create("FOREIGN_KEY_VIOLATION", {
					detail: `Start location '${req.start_location_id}' does not exist`,
					extensions: {
						errors: [
							{
								field: "start_location_id",
								message: "start_location does not exist"
							}
						]
					}
				})
			} else {
				return req
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("type")) {
				throw error
			}
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Could not verify start location '${req.start_location_id}'`,
				extensions: {
					errors: [
						{ field: "start_location_id", message: "verification failed" }
					]
				}
			})
		}
	}
)

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
				throw problems.create("FOREIGN_KEY_VIOLATION", {
					detail: `End location '${req.end_location_id}' does not exist`,
					extensions: {
						errors: [
							{
								field: "end_location_id",
								message: "end_location does not exist"
							}
						]
					}
				})
			} else {
				return req
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("type")) {
				throw error
			}
			throw problems.create("FOREIGN_KEY_VIOLATION", {
				detail: `Could not verify end location '${req.end_location_id}'`,
				extensions: {
					errors: [{ field: "end_location_id", message: "verification failed" }]
				}
			})
		}
	}
)
