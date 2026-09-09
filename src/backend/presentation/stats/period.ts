import { DateTime } from "luxon"
import type { Period } from "./types"

export const formatDate = (period: Period, dt: DateTime): string => {
	switch (period) {
		case "week":
			return dt.toFormat("kkkk-'W'WW")
		case "month":
			return dt.toFormat("yyyy-MM")
		case "year":
			return dt.toFormat("yyyy")
	}
}

export const formatDateLabel = (period: Period, now: DateTime, tz: string): string => {
	const nowInZone = now.setZone(tz)
	switch (period) {
		case "week":
			return nowInZone.startOf("week").toFormat("'W'WW yyyy")
		case "month":
			return nowInZone.toFormat("MMMM yyyy")
		case "year":
			return nowInZone.toFormat("yyyy")
	}
}

export const resolveAnchor = (
	period: Period,
	dateParam: string | undefined,
	tz: string
): DateTime => {
	if (!dateParam) return DateTime.now()

	switch (period) {
		case "week": {
			const dt = DateTime.fromISO(dateParam, { zone: tz })
			return dt.isValid ? dt : DateTime.now()
		}
		case "month": {
			const dt = DateTime.fromISO(dateParam, { zone: tz })
			return dt.isValid ? dt : DateTime.now()
		}
		case "year": {
			const dt = DateTime.fromISO(`${dateParam}-01-01`, { zone: tz })
			return dt.isValid ? dt : DateTime.now()
		}
	}
}
