import { db } from "../client"

export const locationsQueries = {
	async locationExists(id: string): Promise<boolean> {
		const rows = await db`
			SELECT id FROM locations WHERE id = ${id}
		`
		return rows.length > 0
	}
}
