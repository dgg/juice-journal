import type { SQL } from "bun"
import { db as defaultDb } from "../client"

export abstract class DbQuery<TRow, TResult> {
	protected abstract mapResults(rows: TRow[]) : TResult
	protected abstract doQuery(db: SQL): Promise<TRow[]>

	//protected abstract doExecute(db: SQL): Promise<TResult>

	public async execute(db: SQL = defaultDb): Promise<TResult> {
		const rows = await this.doQuery(db)
		return this.mapResults(rows)
	}
}
