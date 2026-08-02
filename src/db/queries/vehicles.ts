import { db } from "../client"

export interface VehicleRow {
	id: string
	description: string
}

export const vehiclesQueries = {
	async findVehicleById(id: string): Promise<VehicleRow | null> {
		const rows = await db`
			SELECT id, description FROM vehicles WHERE id = ${id}
		`
		if (rows.length === 0) return null
		return rows[0] as unknown as VehicleRow
	},

	async vehicleExists(id: string): Promise<boolean> {
		const rows = await db`
			SELECT id FROM vehicles WHERE id = ${id}
		`
		return rows.length > 0
	}
}
