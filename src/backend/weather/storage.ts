import { rootLogger } from "../../utils/logger"

import { fetchWeather, type WeatherParam, WeatherFetchError } from "./fetcher"
import { tripsQueries } from "../../db/queries/trips"

const RETRY_DELAYS = [5_000, 30_000]
const MAX_RETRIES = 2

const tryStore = async (
	tripId: string,
	start: WeatherParam,
	end: WeatherParam,
	attempt: number
): Promise<boolean> => {
	try {
		const weather = await fetchWeather(start, end)
		await tripsQueries.updateWeather(tripId, weather.start, weather.end)
		if (attempt > 1) {
			rootLogger.info({ tripId, attempt }, "Weather async retry succeeded")
			rootLogger.debug(
				{ tripId, attempt, start: weather.start, end: weather.end },
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

const schedule = (
	tripId: string,
	start: WeatherParam,
	end: WeatherParam,
	retryIndex: number
) => {
	if (retryIndex >= MAX_RETRIES) {
		rootLogger.warn({ tripId }, "Weather fetch exhausted retries — leaving NULL")
		return
	}

	setTimeout(async () => {
		const ok = await tryStore(tripId, start, end, retryIndex + 2)
		if (!ok) {
			schedule(tripId, start, end, retryIndex + 1)
		}
	}, RETRY_DELAYS[retryIndex])
}

export type { WeatherParam }

export const storeWeather = async (
	tripId: string,
	start: WeatherParam,
	end: WeatherParam
): Promise<void> => {
	const ok = await tryStore(tripId, start, end, 1)
	if (ok) return

	schedule(tripId, start, end, 0)
}
