import type { SQL } from "bun"
import type { VehicleRow } from "./VehicleRow"
import { DbQuery } from "../DbQuery"

export type { VehicleRow }

export class FindAll extends DbQuery<VehicleRow[]> {
	protected async doExecute(db: SQL): Promise<VehicleRow[]> {
		const vehicles: VehicleRow[] = await db`
SELECT id, description FROM vehicles ORDER BY description
`
		return vehicles
	}
}
