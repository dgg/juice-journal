import pino from "pino"
import type { HonoRequest } from "hono"

const isProduction = process.env.NODE_ENV === "production"
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug")

// Configure the root logger
export const rootLogger = pino(
	{
		level: logLevel
	},
	isProduction
		? pino.destination(1) // stdout for production
		: pino.transport({
				target: "pino-pretty",
				options: {
					colorize: true,
					singleLine: false
				}
			})
)

// Type definition for Hono env with logger
export type Env = {
	Variables: {
		logger: pino.Logger
	}
}
