import { DateTime } from "luxon"

export function displayTz(): string {
	return process.env.DISPLAY_TZ || "Europe/Copenhagen"
}

/**
 * Computes the current calendar month's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function currentMonthBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const monthStart = nowInZone.startOf("month")
	const nextMonthStart = monthStart.plus({ months: 1 })
	return {
		startUtc: monthStart.toUTC(),
		endUtc: nextMonthStart.toUTC()
	}
}

/**
 * Computes the previous calendar month's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function prevMonthBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const prevMonthStart = nowInZone.startOf("month").minus({ months: 1 })
	const currentMonthStart = prevMonthStart.plus({ months: 1 })
	return {
		startUtc: prevMonthStart.toUTC(),
		endUtc: currentMonthStart.toUTC()
	}
}

/**
 * Computes the current ISO week's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function currentWeekBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const weekStart = nowInZone.startOf("week")
	const nextWeekStart = weekStart.plus({ weeks: 1 })
	return {
		startUtc: weekStart.toUTC(),
		endUtc: nextWeekStart.toUTC()
	}
}

/**
 * Computes the previous ISO week's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function prevWeekBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const prevWeekStart = nowInZone.startOf("week").minus({ weeks: 1 })
	const currentWeekStart = prevWeekStart.plus({ weeks: 1 })
	return {
		startUtc: prevWeekStart.toUTC(),
		endUtc: currentWeekStart.toUTC()
	}
}

/**
 * Computes the current calendar year's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function currentYearBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const yearStart = nowInZone.startOf("year")
	const nextYearStart = yearStart.plus({ years: 1 })
	return {
		startUtc: yearStart.toUTC(),
		endUtc: nextYearStart.toUTC()
	}
}

/**
 * Computes the previous calendar year's bounds in UTC.
 * Returns inclusive start and exclusive end as UTC DateTime instances.
 */
export function prevYearBoundsUtc(
	zone: string,
	now: DateTime = DateTime.now()
): { startUtc: DateTime; endUtc: DateTime } {
	const nowInZone = now.setZone(zone)
	const prevYearStart = nowInZone.startOf("year").minus({ years: 1 })
	const currentYearStart = prevYearStart.plus({ years: 1 })
	return {
		startUtc: prevYearStart.toUTC(),
		endUtc: currentYearStart.toUTC()
	}
}

/**
 * Dispatcher to get both current and previous bounds for a given period in UTC.
 * Returns UTC DateTime instances.
 */
export function periodBoundsUtc(
	period: 'week' | 'month' | 'year',
	zone: string,
	now: DateTime = DateTime.now()
): { current: { startUtc: DateTime; endUtc: DateTime }; previous: { startUtc: DateTime; endUtc: DateTime } } {
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
