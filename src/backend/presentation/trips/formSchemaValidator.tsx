import type { Next } from "hono"
import { createMiddleware } from "hono/factory"
import type { ZodSafeParseResult } from "zod"

import { buildTripFormProps } from "./formProps"
import { tripFormSchema, type TripForm, type TripFormRaw, type TripsEnv } from "../types"

import { TripFormFragment } from "../../../frontend/fragments/TripFormFragment"

export const formSchemaValidator = createMiddleware<TripsEnv>(async (c, next: Next) => {
	const body: TripFormRaw = await c.req.parseBody()
				c.set("raw", body)
				const result: ZodSafeParseResult<TripForm> = tripFormSchema.safeParse(body)
				if (!result.success) {
					return c.html(
						<TripFormFragment
							{...await buildTripFormProps({
								form: body,
								error: result.error
							})}
						/>,
						200
					)
				}
				c.set("form", result.data)
				await next()
	await next()
})
