import { describe, it, expect } from "bun:test";
import {
  currentWeekBoundsUtc,
  prevWeekBoundsUtc,
  currentYearBoundsUtc,
  prevYearBoundsUtc,
  periodBoundsUtc
} from "./dates";
import { DateTime } from "luxon";

describe("dates utilities", () => {
  describe("currentWeekBoundsUtc", () => {
    it("should return ISO week bounds in UTC", () => {
      // Use a known date that's definitely in the middle of a week
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" }); // Thursday
      const bounds = currentWeekBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(typeof bounds.startUtc).toBe("string");
      expect(typeof bounds.endUtc).toBe("string");
    });

    it("handles week boundary: Friday late local vs Saturday early UTC", () => {
      // Friday evening in Europe/Copenhagen becomes Saturday early morning UTC
      // This should still belong to the current week (the Friday-Saturday week)
      const fridayLateLocal = DateTime.fromISO("2026-08-14T23:30:00", { zone: "Europe/Copenhagen" }); // Friday 11:30 PM
      const bounds = currentWeekBoundsUtc("Europe/Copenhagen", fridayLateLocal);

      // This should be the week that contains this Friday (starts Monday Aug 10)
      // So the week bounds should be Monday Aug 10 00:00 (CET) to Monday Aug 17 00:00 (CET) -> in UTC
      // Aug 9 22:00:00 - Aug 16 22:00:00
      expect(bounds.startUtc).toBe("2026-08-09T22:00:00.000Z"); // Monday Aug 10 00:00 CET -> UTC
      expect(bounds.endUtc).toBe("2026-08-16T22:00:00.000Z");   // Monday Aug 17 00:00 CET -> UTC
    });
  });

  describe("prevWeekBoundsUtc", () => {
    it("should return previous ISO week bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = prevWeekBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(typeof bounds.startUtc).toBe("string");
      expect(typeof bounds.endUtc).toBe("string");
    });
  });

  describe("currentYearBoundsUtc", () => {
    it("should return year bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = currentYearBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(typeof bounds.startUtc).toBe("string");
      expect(typeof bounds.endUtc).toBe("string");
    });
  });

  describe("prevYearBoundsUtc", () => {
    it("should return previous year bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = prevYearBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(typeof bounds.startUtc).toBe("string");
      expect(typeof bounds.endUtc).toBe("string");
    });
  });

  describe("periodBoundsUtc", () => {
    it("should dispatch correctly for week", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = periodBoundsUtc("week", "Europe/Copenhagen", date);
      
      expect(bounds.current).toBeDefined();
      expect(bounds.previous).toBeDefined();
      expect(bounds.current.startUtc).toBeDefined();
      expect(bounds.current.endUtc).toBeDefined();
      expect(bounds.previous.startUtc).toBeDefined();
      expect(bounds.previous.endUtc).toBeDefined();
    });

    it("should dispatch correctly for month", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = periodBoundsUtc("month", "Europe/Copenhagen", date);
      
      expect(bounds.current).toBeDefined();
      expect(bounds.previous).toBeDefined();
      expect(bounds.current.startUtc).toBeDefined();
      expect(bounds.current.endUtc).toBeDefined();
      expect(bounds.previous.startUtc).toBeDefined();
      expect(bounds.previous.endUtc).toBeDefined();
    });

    it("should dispatch correctly for year", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = periodBoundsUtc("year", "Europe/Copenhagen", date);
      
      expect(bounds.current).toBeDefined();
      expect(bounds.previous).toBeDefined();
      expect(bounds.current.startUtc).toBeDefined();
      expect(bounds.current.endUtc).toBeDefined();
      expect(bounds.previous.startUtc).toBeDefined();
      expect(bounds.previous.endUtc).toBeDefined();
    });

    it("should throw error for invalid period", () => {
      expect(() => {
        periodBoundsUtc("invalid" as any, "Europe/Copenhagen", DateTime.now());
      }).toThrow("Invalid period: invalid");
    });
  });
});