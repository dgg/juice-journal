interface TripRow {
	vehicle_id: string
	start_time: string
	end_time: string
	start_location: Location
	end_location: Location
	daypart: Daypart
	/** trip duration (MIN) */
	duration: number
	/** trip distance (KiloM) */
	distance: number
	/* trip average speed (KiloM-PER-HR) */
	speed: number | null
	/** trip average consumotion (KiloW-HR-PER-HUNDRED-KiloM) */
	consumption: number | null
	weather_start: WeatherSnapshot | null
	weather_end: WeatherSnapshot | null
	/** odometer reading (KiloM) */
	odometer: number | null
}
