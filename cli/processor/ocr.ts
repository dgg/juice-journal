import { Dirent } from "node:fs"
import { join } from "path"
import type { Logger } from "pino"
import sharp from "sharp"
import { Ollama } from "ollama"

import { ocrResponseJsonSchema, ocrResponseSchema } from "./types"
import type { OcrResponse } from "./types"

const PROMPT =
	"extract from the image: what time did we started driving today, the distance (km), the speed (km/h) and the energy consumption (kWh/100km)?"
const MODEL = "deepseek-ocr:3b"

const ollama = new Ollama({
	host: process.env.OLLAMA_HOST
})

const shrinkSize = (file: Dirent<string>): Promise<Buffer<ArrayBuffer>> =>
	sharp(join(file.parentPath, file.name))
		.resize({ fit: "inside", height: 500 })
		.toBuffer()

export const processImage = async (
	logger: Logger,
	file: Dirent<string>
): Promise<OcrResponse> => {
	const image = await shrinkSize(file)
	logger.debug("Image resized")

	const ocrResponse = await ollama.generate({
		model: MODEL,
		prompt: PROMPT,
		think: false,
		images: [image],
		stream: false,
		format: ocrResponseJsonSchema,
		options: { temperature: 0 }
	})
	logger.debug({ ocr: ocrResponse }, "OCR response received")
	const imageData: OcrResponse = ocrResponseSchema.parse(
		JSON.parse(ocrResponse.response)
	)
	logger.info(imageData, "OCR data extracted")
	return imageData
}
