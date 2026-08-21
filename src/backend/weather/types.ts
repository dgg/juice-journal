export interface WeatherReading {
	v: number
	u: string
}

export interface WeatherSnapshot {
	source: "forecast" | "historic"
	observed_at: string
	fetched_at: string
	weather_code: number
	temperature: WeatherReading
	humidity: WeatherReading
	precipitation: WeatherReading
	wind: {
		speed: WeatherReading
		direction: WeatherReading
	}
}

export interface WeatherLocations {
	startLat: number | null
	startLong: number | null
	endLat: number | null
	endLong: number | null
}

export interface WeatherFetchParams {
	locations: WeatherLocations
	startTime: string
	endTime: string
}

export interface WeatherResult {
	start?: WeatherSnapshot
	end?: WeatherSnapshot
}

export const QUDT_UNITS = {
	temperature: "DEG_C",
	humidity: "PERCENT",
	precipitation: "MILLI-M",
	windSpeed: "M-PER-SEC",
	windDirection: "DEG"
} as const

export const HOURLY_PARAMS = [
	"temperature_2m",
	"precipitation",
	"relative_humidity_2m",
	"wind_speed_10m",
	"wind_direction_10m",
	"weather_code"
].join(",")