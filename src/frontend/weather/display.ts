export const WMO_ICON_MAP: Record<number, string> = {
	0: "icon-sun",
	1: "icon-cloud-sun",
	2: "icon-cloud-sun",
	3: "icon-cloudy",
	45: "icon-cloud-fog",
	48: "icon-cloud-fog",
	51: "icon-cloud-drizzle",
	53: "icon-cloud-drizzle",
	55: "icon-cloud-drizzle",
	56: "icon-cloud-drizzle",
	57: "icon-cloud-drizzle",
	61: "icon-cloud-rain",
	62: "icon-cloud-rain",
	65: "icon-cloud-rain",
	66: "icon-cloud-rain",
	67: "icon-cloud-rain",
	71: "icon-cloud-snow",
	73: "icon-cloud-snow",
	75: "icon-cloud-snow",
	77: "icon-cloud-snow",
	80: "icon-cloud-rain",
	81: "icon-cloud-rain",
	82: "icon-cloud-rain",
	85: "icon-cloud-snow",
	86: "icon-cloud-snow",
	95: "icon-cloud-lightning",
	96: "icon-cloud-lightning",
	99: "icon-cloud-lightning"
}

export const FALLBACK_ICON = "icon-thermometer-sun"

export function weatherCodeToIcon(code: number | null): string {
	if (code === null) return FALLBACK_ICON
	return WMO_ICON_MAP[code] ?? FALLBACK_ICON
}

type WindFromClass =
	| "wind-from-n"
	| "wind-from-ne"
	| "wind-from-e"
	| "wind-from-se"
	| "wind-from-s"
	| "wind-from-sw"
	| "wind-from-w"
	| "wind-from-nw"

export function windDirectionToClass(direction: number | null): WindFromClass | null {
	if (direction === null) return null

	const d = direction % 360
	if (d >= 337.5 || d < 22.5) return "wind-from-n"
	if (d >= 22.5 && d < 67.5) return "wind-from-ne"
	if (d >= 67.5 && d < 112.5) return "wind-from-e"
	if (d >= 112.5 && d < 157.5) return "wind-from-se"
	if (d >= 157.5 && d < 202.5) return "wind-from-s"
	if (d >= 202.5 && d < 247.5) return "wind-from-sw"
	if (d >= 247.5 && d < 292.5) return "wind-from-w"
	return "wind-from-nw"
}
