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

/**
 * Computes the previous calendar month's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function prevMonthBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of previous month at 00:00:00 in the zone
	const prevMonthStart = nowInZone.startOf("month").minus({ months: 1 })

	// Start of current month at 00:00:00 in the zone (exclusive end for prev month)
	const currentMonthStart = prevMonthStart.plus({ months: 1 })

	// Convert both to UTC ISO strings
	const startUtc = prevMonthStart.toUTC().toISO()
	const endUtc = currentMonthStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute previous month bounds")
	}

	return {
		startUtc,
		endUtc
	}
}

/**
 * Computes the current ISO week's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 * Weeks start on Monday 00:00:00 in the display timezone.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function currentWeekBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of current week (Monday 00:00:00 in the zone)
	const weekStart = nowInZone.startOf("week")

	// Start of next week (Monday 00:00:00 in the zone)
	const nextWeekStart = weekStart.plus({ weeks: 1 })

	// Convert both to UTC ISO strings
	const startUtc = weekStart.toUTC().toISO()
	const endUtc = nextWeekStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute week bounds")
	}

	return {
		startUtc,
		endUtc
	}
}

/**
 * Computes the previous ISO week's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 * Weeks start on Monday 00:00:00 in the display timezone.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function prevWeekBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of previous week (Monday 00:00:00 in the zone)
	const prevWeekStart = nowInZone.startOf("week").minus({ weeks: 1 })

	// Start of current week (Monday 00:00:00 in the zone)
	const currentWeekStart = prevWeekStart.plus({ weeks: 1 })

	// Convert both to UTC ISO strings
	const startUtc = prevWeekStart.toUTC().toISO()
	const endUtc = currentWeekStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute previous week bounds")
	}

	return {
		startUtc,
		endUtc
	}
}

/**
 * Computes the current calendar year's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function currentYearBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of current year at 00:00:00 Jan 1 in the zone
	const yearStart = nowInZone.startOf("year")

	// Start of next year at 00:00:00 Jan 1 in the zone
	const nextYearStart = yearStart.plus({ years: 1 })

	// Convert both to UTC ISO strings
	const startUtc = yearStart.toUTC().toISO()
	const endUtc = nextYearStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute year bounds")
	}

	return {
		startUtc,
		endUtc
	}
}

/**
 * Computes the previous calendar year's bounds in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 *
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with startUtc and endUtc as ISO strings in UTC
 */
export function prevYearBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: string; endUtc: string } {
	// Create a DateTime in the specified zone
	const nowInZone = now.setZone(zone)

	// Start of previous year at 00:00:00 Jan 1 in the zone
	const prevYearStart = nowInZone.startOf("year").minus({ years: 1 })

	// Start of current year at 00:00:00 Jan 1 in the zone
	const currentYearStart = prevYearStart.plus({ years: 1 })

	// Convert both to UTC ISO strings
	const startUtc = prevYearStart.toUTC().toISO()
	const endUtc = currentYearStart.toUTC().toISO()

	if (!startUtc || !endUtc) {
		throw new Error("Failed to compute previous year bounds")
	}

	return {
		startUtc,
		endUtc
	}
}

/**
 * Dispatcher to get both current and previous bounds for a given period in UTC.
 * Returns inclusive start and exclusive end as ISO 8601 strings.
 * 
 * @param period One of 'week', 'month', or 'year'
 * @param zone IANA timezone string (e.g., "Europe/Copenhagen")
 * @param now Optional DateTime to use as "now" (defaults to DateTime.now())
 * @returns Object with current and previous bounds as { current: {startUtc,endUtc}, previous: {startUtc,endUtc} }
 */
export function periodBoundsUtc(
	period: 'week' | 'month' | 'year',
	zone: string,
	now: DateTime = DateTime.now()
): { current: { startUtc: string; endUtc: string }; previous: { startUtc: string; endUtc: string } } {
	switch (period) {
		case 'week':
			return {
				current: currentWeekBoundsUtc(zone, now),
				previous: prevWeekBoundsUtc(zone, now)
			};
		case 'month':
			return {
				current: currentMonthBoundsUtc(zone, now),
				previous: prevMonthBoundsUtc(zone, now)
			};
		case 'year':
			return {
				current: currentYearBoundsUtc(zone, now),
				previous: prevYearBoundsUtc(zone, now)
			};
		default:
			throw new Error(`Invalid period: ${period}. Expected 'week', 'month', or 'year'`);
	}
}
