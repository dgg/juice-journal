import type { SQL } from "bun"
import type { VehicleRow } from "./VehicleRow"
import { DbQuery } from "../DbQuery"

type IdRow = Pick<VehicleRow, "id">

export class Exists extends DbQuery<boolean> {
	readonly #id: string
	constructor(id: string) {
		super()
		this.#id = id
	}

	protected async doExecute(db: SQL): Promise<boolean> {
		const ids: IdRow[] = await db`
SELECT id FROM vehicles WHERE id = ${this.#id}
`
		return ids.length > 0
	}
}
