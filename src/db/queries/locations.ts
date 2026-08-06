import { db } from "../client"

export interface LocationRow {
	id: string
	label: string
	timezone: string | null
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
			SELECT id, label, timezone FROM locations ORDER BY label
		`
		return rows as unknown as LocationRow[]
	},

	async findLocationByLabel(label: string): Promise<LocationRow | null> {
		const rows = await db`
			SELECT id, label, timezone FROM locations WHERE label = ${label}
		`
		if (rows.length === 0) return null
		return rows[0] as unknown as LocationRow
	}
}
