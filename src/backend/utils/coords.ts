import type { Location } from "../types";

export function locationCoords(
	label: Location
): { latitude: number; longitude: number } {
	const envVar = label === "home" ? "HOME_LATLNG" : "WORK_LATLNG"
	const raw = process.env[envVar]

	if (!raw) {
		throw new Error(`${envVar} is not set`)
	}

	const parts = raw.split(",")
	if (parts.length !== 2) {
		throw new Error(`${envVar}=${raw} is malformed — expected comma-separated lat,lng`)
	}

	const latitude = Number.parseFloat(parts[0]!)
	const longitude = Number.parseFloat(parts[1]!)

	if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
		throw new Error(
			`${envVar}=${raw} is malformed — could not parse latitude or longitude as numbers`
		)
	}

	return { latitude, longitude }
}
