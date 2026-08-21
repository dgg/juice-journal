export function nearestBucket(hourlyTimes: string[], target: string): number {
	if (hourlyTimes.length === 0) return -1

	if (hourlyTimes.length === 1) return 0

	const targetMs = new Date(target).getTime()
	const first = hourlyTimes[0]
	if (!first) return 0

	let bestIdx = 0
	let bestDiff = Math.abs(new Date(first).getTime() - targetMs)

	for (let i = 1; i < hourlyTimes.length; i++) {
		const t = hourlyTimes[i]
		if (!t) continue
		const diff = Math.abs(new Date(t).getTime() - targetMs)
		if (diff < bestDiff) {
			bestDiff = diff
			bestIdx = i
		}
	}

	return bestIdx
}