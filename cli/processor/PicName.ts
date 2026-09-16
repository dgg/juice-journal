import { DateTime } from "luxon"

const NAME_PATTERN: RegExp =
	/^(?:\w)+_(?<yyyy>\d{4})(?<MM>\d{2})(?<dd>\d{2})_(?<hh>\d{2})(?<mm>\d{2})/

export class PicName {
	readonly fileName: string
	readonly year: number
	readonly month: number
	readonly day: number

	readonly hour: number
	readonly minute: number

	readonly date: DateTime
	constructor(fileName: string) {
		this.fileName = fileName
		const match = fileName.match(NAME_PATTERN)
		if (!match || !match.groups) {
			throw new Error("Picture information cannot be recognized")
		}
		this.year = parseInt(match.groups["yyyy"]!, 10)
		this.month = parseInt(match.groups["MM"]!, 10)
		this.day = parseInt(match.groups["dd"]!, 10)
		this.hour = parseInt(match.groups["hh"]!, 10)
		this.minute = parseInt(match.groups["mm"]!, 10)

		const { year, month, day, hour, minute } = this

		this.date = DateTime.fromObject(
			{
				year,
				month,
				day,
				hour,
				minute
			},
			{ zone: "UTC" }
		)
	}
}
