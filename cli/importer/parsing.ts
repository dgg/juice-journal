import { DateTime, Duration } from "luxon";


export const parseDateTime = (dt: string): DateTime => DateTime.fromFormat(dt, "yyyy-MM-dd hh:mm", { zone: "Europe/Copenhagen" });export const parseDuration = (isoTime: string): Duration => Duration.fromISOTime(isoTime)

