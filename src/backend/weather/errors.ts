
export class WeatherParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = WeatherParseError.name;
	}
}
export class WeatherFetchError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message)
		this.name = WeatherFetchError.name
	}
}
