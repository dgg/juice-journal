import { DateTime } from "luxon"

/**
 * Resolves the display timezone for month-boundary computation.
 * Uses the fallback chain: end_location.timezone → start_location.timezone → fallback.
 * Treats null, undefined, and empty strings as missing.
 */
export function resolveDisplayTz(
	endLocationTz?: string | null,
	startLocationTz?: string | null,
	fallback: string = "Europe/Copenhagen"
): string {
	if (endLocationTz && endLocationTz.trim()) {
		return endLocationTz
	}
	if (startLocationTz && startLocationTz.trim()) {
		return startLocationTz
	}
	return fallback
}

/**
 * Computes the current calendar month's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function currentMonthBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of current month at 00:00:00 in the zone
	const monthStart = nowInZone.startOf("month")

	// Start of next month at 00:00:00 in the zone (which is exclusive end for current month)
	const nextMonthStart = monthStart.plus({ months: 1 })

	// Convert both to UTC ISO strings
	const startUtc = monthStart.toUTC().toISO()
	const endUtc = nextMonthStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute month bounds")
	}

	return {
		startUtc,
		endUtc
	}
}
