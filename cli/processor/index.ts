import { readdir } from "node:fs/promises"

import { DateRange } from "./DateRange"
import { Picture } from "./Picture"
import { Weather } from "./Weather"
import { processImage } from "./ocr"
import { store } from "./storage"
import { transformer } from "./transformation"
import type { OcrResponse, TripData } from "./types"

import { rootLogger } from "./logger"

const files = (await readdir("./import", { withFileTypes: true }))
	// sort files DESC by name => oldest file processed first
	.sort((a, b) => b.name.localeCompare(a.name))

rootLogger.info({count: files.length },  "Processing pictures")

const batchTrips: TripData[] = []
const range = new DateRange()

for (const de of files) {
	const deviceLogger = rootLogger.child({ file: de.name })
	let picture
	try {
		picture = new Picture(de.name)
		const imageData: OcrResponse = await processImage(deviceLogger, de)
		const data: TripData = transformer(deviceLogger, picture, imageData)
		batchTrips.push(data)
		range.maybeExtend(data.start.time).maybeExtend(data.end.time)
		deviceLogger.debug({ start: range.start, end: range.end }, "weather range")
	} catch (err) {
		rootLogger.error(err, "Error encountered processing file '%s'", de.name)
	}
}

if (range.empty) {
	rootLogger.fatal("Not enough image data to proceed")
	process.exit(1)
}

rootLogger.debug({ start: range.start, end: range.end }, "fetching weather")
const weather = await Weather.fetch(range.start!, range.end!)
rootLogger.info({ start: range.start, end: range.end }, "weather fetched")

batchTrips.forEach((d) => {
	d.start.weather = weather.getWeather(d.start.location, d.start.time)
	d.end.weather = weather.getWeather(d.end.location, d.end.time)
})

rootLogger.debug({ count: batchTrips.length }, "storing trips")
store(process.env.VEHICLE_ID!, batchTrips)
rootLogger.info({ count: batchTrips.length }, "trips stored")
