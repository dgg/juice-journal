import type { SQL } from "bun"
import { db as defaultDb } from "../client"

export abstract class DbQuery<TResult> {
	protected abstract doExecute(db: SQL): Promise<TResult>

	public async execute(db: SQL = defaultDb): Promise<TResult> {
		return this.doExecute(db)
	}
}
