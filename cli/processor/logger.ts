import pino from "pino"

const logLevel = process.env.LOG_LEVEL || "info"

// Configure the root logger
export const rootLogger = pino(
	{ level: logLevel, redact:{
		paths: ["ocr.context"],
		censor: "**TOO_LONG**"
	} },
	pino.transport({
		target: "pino-pretty",
		options: {
			colorize: true,
			singleLine: false
		}
	})
)
