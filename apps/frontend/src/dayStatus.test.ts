import { describe, expect, it } from "vitest";
import { getDayStatusText, isDayStatusSelected } from "./dayStatus.js";

describe("day status", () => {
  it("maps status codes to the corresponding labels", () => {
    expect(getDayStatusText("K")).toBe("Krank");
    expect(getDayStatusText("U")).toBe("Urlaub");
    expect(getDayStatusText("F")).toBe("Feiertag");
    expect(getDayStatusText("UF")).toBe("unbezahlt frei");
  });

  it("treats a selected status as blocking the day", () => {
    expect(isDayStatusSelected("K")).toBe(true);
    expect(isDayStatusSelected("")).toBe(false);
  });
});
