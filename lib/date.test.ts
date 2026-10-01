import { describe, expect, it } from "vitest";
import { addDaysToLocalDate, getLocalDateString, getLocalWeekStart } from "./date";

describe("getLocalDateString", () => {
  it("usa la fecha de Ciudad de México aunque en UTC ya sea el día siguiente", () => {
    // 2026-10-01 03:00 UTC = 2026-09-30 21:00 en America/Mexico_City (UTC-6).
    expect(getLocalDateString(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-30");
  });
});

describe("addDaysToLocalDate", () => {
  it("cruza meses y años", () => {
    expect(addDaysToLocalDate("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysToLocalDate("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("getLocalWeekStart", () => {
  it("regresa el lunes de la semana (lunes a domingo)", () => {
    expect(getLocalWeekStart("2026-09-30")).toBe("2026-09-28"); // miércoles
    expect(getLocalWeekStart("2026-09-28")).toBe("2026-09-28"); // lunes
    expect(getLocalWeekStart("2026-10-04")).toBe("2026-09-28"); // domingo
  });
});
