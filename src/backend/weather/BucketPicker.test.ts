import { describe, it, expect, beforeAll } from "bun:test"

import { DateTime } from "luxon"

import { BucketPicker } from "./BucketPicker"
import { WeatherParseError } from "./errors"

interface DateObj {
	y: number
	m: number
	d: number
	h: number
}
const bucketGenerator = (utcStart: DateObj, count: number): string[] => {
	const buckets: string[] = []
	const effectiveStart: DateTime = DateTime.utc(
		utcStart.y,
		utcStart.m,
		utcStart.d,
		utcStart.h
	)
	for (let i = 0; i < count; i++) {
		buckets.push(effectiveStart.plus({ hours: i }).toUTC().toISO()!)
	}
	return buckets
}

describe(BucketPicker.name, () => {
	describe(BucketPicker.prototype.pick.name, () => {
		describe("exact match", () => {
			it("exact match index", () => {
				const eightToTen = bucketGenerator({ y: 2026, m: 7, d: 20, h: 8 }, 3)
				const nine = DateTime.utc(2026, 7, 20, 9)

				var subject = new BucketPicker(eightToTen)
				const pick = subject.pick(nine)

				expect(pick).toEqual({ index: 1, value: nine })
			})
		})

		describe("between two buckets", () => {
			let eightToNine: BucketPicker
			beforeAll(() => {
				const eight: DateObj = { y: 2026, m: 7, d: 20, h: 8 }
				eightToNine = new BucketPicker(bucketGenerator(eight, 2))
			})
			describe("closest in lower side", () => {
				it("picks lower bucket", () => {
					const closerToLower = DateTime.utc(2026, 7, 20, 8, 23)
					const lowerPick = eightToNine.pick(closerToLower)
					expect(lowerPick).toEqual({
						index: 0,
						value: DateTime.utc(2026, 7, 20, 8)
					})
				})
			})
			describe("closes in higher side", () => {
				it("picks higher bucket", () => {
					const closerToHigher = DateTime.utc(2026, 7, 20, 8, 45)
					const higherPick = eightToNine.pick(closerToHigher)
					expect(higherPick).toEqual({
						index: 1,
						value: DateTime.utc(2026, 7, 20, 9)
					})
				})
			})
		})

		describe("no buckets", () => {
			it("error", () => {
				expect(() => new BucketPicker([])).toThrowError(WeatherParseError)
			})
		})

		describe("one bucket", () => {
			it("The Bucket", () => {
				const anytime: DateTime = DateTime.utc()
				const singleItem = bucketGenerator({ y: 2026, m: 7, d: 20, h: 8 }, 1)

				var subject = new BucketPicker(singleItem)
				const pick = subject.pick(anytime)

				expect(pick).toEqual({
					index: 0,
					value: DateTime.fromISO(singleItem[0]!, { zone: "UTC" })
				})
			})
		})

		describe("before any bucket", () => {
			it("earliest bucket", () => {
				const beforeAnyBucket = DateTime.utc(2026, 7, 20, 7)
				const nineToTen = bucketGenerator({ y: 2026, m: 7, d: 20, h: 9 }, 2)

				const subject = new BucketPicker(nineToTen)
				const earliestBucket = subject.pick(beforeAnyBucket)

				expect(earliestBucket).toEqual({
					index: 0,
					value: DateTime.fromISO(nineToTen[0]!, { zone: "UTC" })
				})
			})
		})

		describe("after every bucket", () => {
			it("latest bucket", () => {
				const afterEveryBucket = DateTime.utc(2026, 7, 20, 15)
				const nineToTen = bucketGenerator({ y: 2026, m: 7, d: 20, h: 9 }, 2)

				const subject = new BucketPicker(nineToTen)
				const latestBucket = subject.pick(afterEveryBucket)

				expect(latestBucket).toEqual({
					index: 1,
					value: DateTime.fromISO(nineToTen[1]!, { zone: "UTC" })
				})
			})
		})
	})
})
