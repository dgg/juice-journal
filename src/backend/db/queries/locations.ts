import { db } from "../client"

export interface LocationRow {
	id: string
	label: string
	latitude: number
	longitude: number
}

function mapLocationRow(raw: Record<string, unknown>): LocationRow {
	return {
		id: raw.id as string,
		label: raw.label as string,
		latitude: Number(raw.latitude),
		longitude: Number(raw.longitude)
	}
}

export const locationsQueries = {
	async locationExists(id: string): Promise<boolean> {
		const rows = await db`
			SELECT id FROM locations WHERE id = ${id}
		`
		return rows.length > 0
	},

	async listAllLocations(): Promise<LocationRow[]> {
		const rows = await db`
			SELECT id, label, latitude, longitude FROM locations ORDER BY label
		`
		return rows.map((r: unknown) => mapLocationRow(r as Record<string, unknown>))
	},

	async findLocationById(id: string): Promise<LocationRow | null> {
		const rows = await db`
			SELECT id, label, latitude, longitude FROM locations WHERE id = ${id}
		`
		if (rows.length === 0) return null
		return mapLocationRow(rows[0] as unknown as Record<string, unknown>)
	},

	async findLocationByLabel(label: string): Promise<LocationRow | null> {
		const rows = await db`
			SELECT id, label, latitude, longitude FROM locations WHERE label = ${label}
		`
		if (rows.length === 0) return null
		return mapLocationRow(rows[0] as unknown as Record<string, unknown>)
	}
}
