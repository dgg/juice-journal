import { DbQuery } from "../DbQuery";

interface YearRow {
	year: number | null
}

export class GetEarliestYear extends DbQuery<YearRow, number | null> {
	protected override mapResults(rows: YearRow[]): number | null {
		return rows[0]?.year ?? null
	}

	protected override async doQuery(db: Bun.SQL): Promise<YearRow[]> {
		const rows: YearRow[] = await db`
			SELECT EXTRACT(YEAR FROM MIN(end_time))::int as year FROM trips
		`
		return rows
	}
}
