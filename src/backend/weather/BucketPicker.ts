import { DateTime } from "luxon"

import { WeatherParseError } from "./errors"

export interface Bucket {
	index: number
	value: DateTime
}

class BucketChoice {
	public readonly index: number
	public readonly time: DateTime
	public readonly diff: number
	constructor(timeBuckets: string[], index: number, targetMs: number) {
		this.index = index
		this.time = DateTime.fromISO(timeBuckets[index]!, { zone: "UTC" })
		this.diff = Math.abs(this.time.toMillis() - targetMs)
	}

	public lessThan(other: BucketChoice): boolean {
		return this.diff < other.diff
	}

	public asBucket(): Bucket {
		return { index: this.index, value: this.time }
	}
}

export class BucketPicker {
	readonly #buckets: string[]
	constructor(timeBuckets: string[]) {
		if (timeBuckets.length === 0) throw new WeatherParseError("Empty time buckets")
		this.#buckets = timeBuckets
	}

	public pick(time: DateTime): Bucket {
		const targetMs = time.toMillis()

		let best = new BucketChoice(this.#buckets, 0, targetMs)
		for (let i = 1; i < this.#buckets.length; i++) {
			const current = new BucketChoice(this.#buckets, i, targetMs)
			if (current.lessThan(best)) {
				best = current
			} else {
				break
			}
		}

		return best.asBucket()
	}
}
