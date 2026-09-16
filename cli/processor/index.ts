import { readdir } from "node:fs/promises"
import { join } from "path"
import sharp from "sharp"
import { Ollama } from "ollama"

import { PicName } from "./PicName"
import { ocrResponseJsonSchema, ocrResponseSchema } from "./types"
import type { OcrResponse, TripData } from "./types"
import { transformer } from "./transformation"
import { DateRange } from "./DateRange"
import { Weather } from "./Weather"
import { store } from "./storage"

const PROMPT = "in the image, what is the distance, the speed and the energy consumption, as well as the time we started driving today?"
const MODEL = "deepseek-ocr:3b"

const files = await readdir("./import", { withFileTypes: true })

const ollama = new Ollama({
	host: process.env.OLLAMA_HOST
})

const batchTrips: TripData[] = []
const range= new DateRange()

for (const de of files) {
	const picName = new PicName(de.name)

	const imageContent = await sharp(join(de.parentPath, de.name))
		.resize({ fit: "inside", height: 500 })
		.toBuffer()

	try {
		const ocrResponse = await ollama.generate({
			model: MODEL,
			prompt: PROMPT,
			think: false,
			images: [imageContent],
			stream: false,
			format: ocrResponseJsonSchema,
			options: {
				temperature: 0
			}
		})
		const imageData: OcrResponse = ocrResponseSchema.parse(
			JSON.parse(ocrResponse.response)
		)
		const data: TripData = transformer(picName, imageData)
		batchTrips.push(data)
		range.maybeExtend(data.start.time).maybeExtend(data.end.time)
	} catch (err) {
		console.error(picName.fileName, err)
		throw err
	}
}

const weather = await Weather.fetch(range.start!, range.end!)

batchTrips.forEach(d => {
	d.start.weather = weather.getWeather(d.start.location, d.start.time)
	d.end.weather = weather.getWeather(d.end.location, d.end.time)
})

store(process.env.VEHICLE_ID!, batchTrips)
