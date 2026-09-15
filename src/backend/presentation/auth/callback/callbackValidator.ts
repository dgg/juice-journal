import * as z from "zod"

import {createFactory} from "hono/factory"

import { STATE_COOKIE_NAME } from "../cookie"

export const callbackQuerySchema = z.object({
	code: z.string().nonempty(),
	state: z.string().nonempty()
})

export const callbackCookiesSchema = z.object({
	[STATE_COOKIE_NAME]: z.string().nonempty()
})

export type CallbackQuery = z.infer<typeof callbackQuerySchema>
export type CallbackCookies = z.infer<typeof callbackCookiesSchema>
