import type { SQL } from "bun"
import type { VehicleRow } from "./VehicleRow"
import { DbQuery } from "../DbQuery"

type IdRow = Pick<VehicleRow, "id">

export class Exists extends DbQuery<IdRow, boolean> {
	readonly #id: string
	constructor(id: string) {
		super()
		this.#id = id
	}

	protected override mapResults(rows: IdRow[]): boolean {
		return rows.length > 0
	}

	protected async doQuery(db: SQL): Promise<IdRow[]> {
		const ids: IdRow[] = await db`
SELECT id FROM vehicles WHERE id = ${this.#id}
`
return ids
	}
}
