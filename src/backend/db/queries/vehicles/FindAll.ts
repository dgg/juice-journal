import type { SQL } from "bun"
import type { VehicleRow } from "./VehicleRow"
import { DbQuery } from "../DbQuery"

export type { VehicleRow }

export class FindAll extends DbQuery<VehicleRow, VehicleRow[]> {
	protected override mapResults(rows: VehicleRow[]): VehicleRow[] {
		return rows
	}

	protected async doQuery(db: SQL): Promise<VehicleRow[]> {
		const row: VehicleRow[] = await db`
SELECT id, description FROM vehicles ORDER BY description
`
		return row
	}
}
