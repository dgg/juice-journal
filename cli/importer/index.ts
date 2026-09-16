import { parse } from "@fast-csv/parse"
import { createReadStream } from "fs"

import { Weather } from "./Weather"
import type { Raw, Transformed } from "./types"
import { transformer } from "./transformation"
import { store } from "./storage"

const weather = await Weather.load("./weather.json")
const trips: Transformed[] = []

const csv = createReadStream("./trips.csv")
	.pipe(
		parse<Raw, Transformed>({
			headers: [
				"start",
				"end",
				undefined,
				undefined,
				"duration",
				"distance",
				undefined,
				"consumption",
				"speed",
				undefined,
				"odometer"
			],
			renameHeaders: true
		}).transform((data: Raw): Transformed => transformer(weather, data))
	)
	.on("data", (r) => trips.push(r))
	.on("end", async () => await store(process.env.VEHICLE_ID!, trips))
