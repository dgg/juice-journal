import { rootLogger } from "../../utils/logger"
import { fetchWeather, WeatherFetchError } from "./fetch"
import { tripsQueries } from "../../db/queries/trips"
import type { WeatherLocations, WeatherSnapshot } from "./types"

const RETRY_DELAYS = [5_000, 30_000]
const MAX_RETRIES = 2

async function doFetch(
	tripId: string,
	locations: WeatherLocations,
	startTime: string,
	endTime: string,
	attempt: number
): Promise<boolean> {
	try {
		const weather = await fetchWeather({ locations, startTime, endTime })
		const start = weather.start ? (weather.start as object) : null
		const end = weather.end ? (weather.end as object) : null
		await tripsQueries.updateWeather(tripId, start, end)

		if (attempt > 1) {
			rootLogger.info(
				{ tripId, attempt, start: !!weather.start, end: !!weather.end },
				"Weather async retry succeeded"
			)
		}
		return true
	} catch (err) {
		const detail =
			err instanceof WeatherFetchError
				? `Open-Meteo ${err.status ?? "network-error"}: ${err.message}`
				: (err as Error).message
		rootLogger.warn({ tripId, attempt, detail }, "Weather fetch failed")
		return false
	}
}

export async function recordWeather(
	tripId: string,
	locations: WeatherLocations,
	startTime: string,
	endTime: string
): Promise<void> {
	const ok = await doFetch(tripId, locations, startTime, endTime, 1)
	if (ok) return

	scheduleRetry(tripId, locations, startTime, endTime, 0)
}

function scheduleRetry(
	tripId: string,
	locations: WeatherLocations,
	startTime: string,
	endTime: string,
	retryIndex: number
): void {
	if (retryIndex >= MAX_RETRIES) {
		rootLogger.warn(
			{ tripId },
			"Weather fetch exhausted retries — leaving NULL"
		)
		return
	}

	setTimeout(async () => {
		const ok = await doFetch(tripId, locations, startTime, endTime, retryIndex + 2)
		if (!ok) {
			scheduleRetry(tripId, locations, startTime, endTime, retryIndex + 1)
		}
	}, RETRY_DELAYS[retryIndex])
}