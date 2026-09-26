import { toNumber } from "../../convert"
import { DbQuery } from "../DbQuery"

interface OdometerRow {
	odometer: string | null
}

export class GetLatestOdometer extends DbQuery<OdometerRow, number | null> {
	constructor(private readonly vehicleId: string) {
		super()
	}

	protected override mapResults(rows: OdometerRow[]): number | null {
		return toNumber(rows[0]?.odometer)
	}

	protected override async doQuery(db: Bun.SQL): Promise<OdometerRow[]> {
		const rows: OdometerRow[] = await db`
			SELECT odometer FROM trips
			WHERE vehicle_id = ${this.vehicleId}
				AND odometer IS NOT NULL
			ORDER BY end_time DESC
			LIMIT 1
		`
		return rows
	}
}
