import type { DateTime } from "luxon"

import { DbQuery } from "../DbQuery"
import { fromUtcDateTime } from "../../convert"

interface TripId {
	id: string
}

export class Exists extends DbQuery<TripId, boolean> {
	constructor(
		private readonly vehicleId: string,
		private readonly endTime: DateTime
	) {
		super()
	}

	protected override mapResults(rows: TripId[]): boolean {
		return rows.length > 0
	}

	protected override async doQuery(db: Bun.SQL): Promise<TripId[]> {
		const rows: TripId[] = await db`
			SELECT id FROM trips
			WHERE vehicle_id = ${this.vehicleId}
				AND end_time = ${fromUtcDateTime(this.endTime)}
			`
		return rows
	}
}
