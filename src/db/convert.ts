import { DateTime } from "luxon"

/**
 * Parse a NUMERIC/DECIMAL column returned as a string from Postgres
 * into a JavaScript number. Returns null for null/undefined.
 */
export function toNumber(value: string | null | undefined): number | null {
	if (typeof value !== "string") return null
	const n = parseFloat(value)
	return Number.isFinite(n) ? n : null
}

/**
 * Convert a native Date from a TIMESTAMPTZ column into a Luxon DateTime
 * in UTC. Query objects return this so callers never touch raw Date.
 */
export function toUtcDateTime(value: Date): DateTime {
	return DateTime.fromJSDate(value, { zone: "utc" })
}

/**
 * Convert a Luxon DateTime to an ISO string for insertion into a
 * TIMESTAMPTZ column. Asserts the DateTime is in UTC.
 */
export function fromUtcDateTime(value: DateTime): string {
	if (value.zoneName !== "UTC") {
		throw new Error(
			`fromUtcDateTime expected a UTC DateTime but got zone "${value.zoneName}"`
		)
	}
	return value.toISO()!
}
