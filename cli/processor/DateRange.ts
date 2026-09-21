import type { DateTime } from "luxon"

export class DateRange {
	#start: DateTime | null = null
	#end: DateTime | null = null

	public maybeExtend(date: DateTime): DateRange {
		if (this.#start === null || this.#start > date) this.#start = date

		if (this.#end === null || this.#end < date) this.#end = date

		return this
	}

	public get start(): DateTime | null {
		return this.#start
	}

	public get end(): DateTime | null {
		return this.#end
	}

	public get empty() : boolean{
		return !this.#start || !this.#end
	}
}
