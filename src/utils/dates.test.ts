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
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = currentWeekBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(bounds.startUtc instanceof DateTime).toBe(true);
      expect(bounds.endUtc instanceof DateTime).toBe(true);
      expect(bounds.startUtc.zoneName).toBe("UTC");
      expect(bounds.endUtc.zoneName).toBe("UTC");
    });

    it("handles week boundary: Friday late local vs Saturday early UTC", () => {
      const fridayLateLocal = DateTime.fromISO("2026-08-14T23:30:00", { zone: "Europe/Copenhagen" });
      const bounds = currentWeekBoundsUtc("Europe/Copenhagen", fridayLateLocal);

      expect(bounds.startUtc.toISO()).toBe("2026-08-09T22:00:00.000Z");
      expect(bounds.endUtc.toISO()).toBe("2026-08-16T22:00:00.000Z");
    });
  });

  describe("prevWeekBoundsUtc", () => {
    it("should return previous ISO week bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = prevWeekBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(bounds.startUtc instanceof DateTime).toBe(true);
      expect(bounds.endUtc instanceof DateTime).toBe(true);
      expect(bounds.startUtc.zoneName).toBe("UTC");
      expect(bounds.endUtc.zoneName).toBe("UTC");
    });
  });

  describe("currentYearBoundsUtc", () => {
    it("should return year bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = currentYearBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(bounds.startUtc instanceof DateTime).toBe(true);
      expect(bounds.endUtc instanceof DateTime).toBe(true);
      expect(bounds.startUtc.zoneName).toBe("UTC");
      expect(bounds.endUtc.zoneName).toBe("UTC");
    });
  });

  describe("prevYearBoundsUtc", () => {
    it("should return previous year bounds in UTC", () => {
      const date = DateTime.fromISO("2026-08-13T12:00:00", { zone: "Europe/Copenhagen" });
      const bounds = prevYearBoundsUtc("Europe/Copenhagen", date);
      
      expect(bounds.startUtc).toBeDefined();
      expect(bounds.endUtc).toBeDefined();
      expect(bounds.startUtc instanceof DateTime).toBe(true);
      expect(bounds.endUtc instanceof DateTime).toBe(true);
      expect(bounds.startUtc.zoneName).toBe("UTC");
      expect(bounds.endUtc.zoneName).toBe("UTC");
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
      expect(bounds.current.startUtc instanceof DateTime).toBe(true);
      expect(bounds.current.endUtc instanceof DateTime).toBe(true);
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
      expect(bounds.current.startUtc instanceof DateTime).toBe(true);
      expect(bounds.current.endUtc instanceof DateTime).toBe(true);
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
      expect(bounds.current.startUtc instanceof DateTime).toBe(true);
      expect(bounds.current.endUtc instanceof DateTime).toBe(true);
    });

    it("should throw error for invalid period", () => {
      expect(() => {
        periodBoundsUtc("invalid" as any, "Europe/Copenhagen", DateTime.now());
      }).toThrow("Invalid period: invalid");
    });
  });
});