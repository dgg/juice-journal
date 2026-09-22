import type { SQL } from "bun"
import type { VehicleRow } from "./VehicleRow"
import { DbQuery } from "../DbQuery"

export type { VehicleRow }

export class GetFromLatestTrip extends DbQuery<VehicleRow | null> {
	protected async doExecute(db: SQL): Promise<VehicleRow | null> {
		const [vehicle] = await db`
SELECT v.id, v.description
FROM trips AS t INNER JOIN vehicles AS v ON t.vehicle_id = v.id
ORDER BY t.end_time DESC
LIMIT 1
`
		return vehicle === undefined ? null : vehicle
	}
}
