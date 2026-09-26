import type { DateTime } from "luxon"

import type { Location, Daypart, TripInput } from "../../../types"
import type { WeatherParam, WeatherSnapshot } from "../../../weather/types"

import { DbQuery } from "../DbQuery"

import { fromUtcDateTime, toNumber, toUtcDateTime } from "../../convert"
import { locationCoords } from "../../../utils/coords"
import { storeWeather } from "../../../weather/storage"

import type { TripDetail } from "./trips"

export interface TripRow {
	id: string
	vehicle_id: string
	start_time: Date
	end_time: Date
	start_location: Location
	end_location: Location
	daypart: Daypart
	/** trip duration (MIN) */
	duration: number
	/** trip distance (KiloM) */
	distance: string
	/* trip average speed (KiloM-PER-HR) */
	speed: string | null
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: string | null
	weather_start: WeatherSnapshot | null
	weather_end: WeatherSnapshot | null
	/** odometer reading (KiloM) */
	odometer: string | null
	tracking_created: Date
	tracking_updated: Date
}

export class Insert extends DbQuery<TripRow, TripDetail> {
	constructor(private readonly input: TripInput) {
		super()
	}
	protected override mapResults(rows: TripRow[]): TripDetail {
		const {
			id,
			vehicle_id,
			start_location,
			end_location,
			daypart,
			duration,
			weather_start,
			weather_end,
			...raw
		} = rows[0]!
		const trip: TripDetail = {
			id,
			vehicle_id,
			start_time: toUtcDateTime(raw.start_time as Date),
			end_time: toUtcDateTime(raw.end_time as Date),
			start_location,
			end_location,
			daypart,
			duration,
			distance: toNumber(raw.distance)!,
			speed: toNumber(raw.speed),
			consumption: toNumber(raw.consumption),
			weather_start,
			weather_end,
			odometer: toNumber(raw.odometer),
			tracking_created: toUtcDateTime(raw.tracking_created as Date),
			tracking_updated: toUtcDateTime(raw.tracking_updated as Date)
		}
		return trip
	}

	protected override async doQuery(db: Bun.SQL): Promise<TripRow[]> {
		const rows: TripRow[] = await db`
			INSERT INTO trips (
				vehicle_id,
				start_time,
				end_time,
				start_location,
				end_location,
				daypart,
				duration,
				distance,
				speed,
				consumption,
				weather_start,
				weather_end,
				odometer
			)
			VALUES (
				${this.input.vehicle_id},
				${fromUtcDateTime(this.input.start_time)},
				${fromUtcDateTime(this.input.end_time)},
				${this.input.start_location},
				${this.input.end_location},
				${this.input.daypart},
				${this.input.duration},
				${this.input.distance},
				${this.input.speed ?? null},
				${this.input.consumption ?? null},
				null,
				null,
				${this.input.odometer ?? null}
			)
			RETURNING *
		`

		const start: WeatherParam = {
			location: locationCoords(this.input.start_location),
			time: this.input.start_time
		}
		const end: WeatherParam = {
			location: locationCoords(this.input.end_location),
			time: this.input.end_time
		}
		const tripId = rows[0]!.id
		await storeWeather(tripId, start, end)
		const updated: TripRow[] = await db`SELECT * FROM trips WHERE id = ${tripId}`
		return updated
	}
}
