import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { dayFromDate, overlaps, fitsAvailability, hasConflict, canTransition } = require("../utils/sessionRules");

describe("dayFromDate", () => {
  it("returns the correct day-of-week token", () => {
    expect(dayFromDate("2026-04-30")).toBe("thu"); // Apr 30 2026 is Thursday
    expect(dayFromDate("2026-05-04")).toBe("mon");
  });
});

describe("overlaps + fitsAvailability + hasConflict", () => {
  it("detects overlapping ranges", () => {
    expect(overlaps("14:00", "15:00", "14:30", "16:00")).toBe(true);
    expect(overlaps("14:00", "15:00", "15:00", "16:00")).toBe(false);
    expect(overlaps("14:00", "15:00", "13:00", "14:00")).toBe(false);
  });

  it("only fits availability if a slot fully covers the requested time", () => {
    const slots = [
      { start_time: "14:00", end_time: "16:00" },
      { start_time: "10:00", end_time: "11:00" },
    ];
    expect(fitsAvailability("14:30", "15:30", slots)).toBe(true);
    expect(fitsAvailability("13:00", "15:00", slots)).toBe(false); // starts before slot
    expect(fitsAvailability("09:00", "10:30", slots)).toBe(false); // crosses slot edge
  });

  it("flags a conflict only when an existing session overlaps", () => {
    const existing = [{ start_time: "14:00", end_time: "15:00" }];
    expect(hasConflict("14:30", "15:30", existing)).toBe(true);
    expect(hasConflict("15:00", "16:00", existing)).toBe(false);
  });
});

describe("canTransition (session state machine)", () => {
  it("allows the right actor to perform the right transition", () => {
    expect(canTransition("requested", "confirmed", "tutor")).toBe(true);
    expect(canTransition("requested", "confirmed", "student")).toBe(false);
    expect(canTransition("confirmed", "completed", "tutor")).toBe(true);
    expect(canTransition("requested", "cancelled", "student")).toBe(true);
    expect(canTransition("requested", "cancelled", "tutor")).toBe(true);
  });
  it("rejects transitions out of terminal states", () => {
    expect(canTransition("completed", "cancelled", "tutor")).toBe(false);
    expect(canTransition("cancelled", "confirmed", "tutor")).toBe(false);
  });
});
