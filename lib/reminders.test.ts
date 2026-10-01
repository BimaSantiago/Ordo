import { describe, expect, it } from "vitest";
import { computeRemindAt, reminderOptionsFor } from "./reminders";
import { localDateTimeToUtcIso } from "./date";

describe("localDateTimeToUtcIso", () => {
  it("convierte hora de Ciudad de México (UTC-6) a UTC", () => {
    expect(localDateTimeToUtcIso("2026-10-01", "16:00")).toBe("2026-10-01T22:00:00.000Z");
    expect(localDateTimeToUtcIso("2026-10-01", "20:30")).toBe("2026-10-02T02:30:00.000Z");
  });
});

describe("computeRemindAt", () => {
  it("sin aviso regresa null", () => {
    expect(computeRemindAt("none", "2026-10-01", "16:00")).toBeNull();
  });

  it("avisos relativos a la hora de la actividad", () => {
    expect(computeRemindAt("at_time", "2026-10-01", "16:00")).toBe("2026-10-01T22:00:00.000Z");
    expect(computeRemindAt("10m", "2026-10-01", "16:00")).toBe("2026-10-01T21:50:00.000Z");
    expect(computeRemindAt("1h", "2026-10-01", "16:00")).toBe("2026-10-01T21:00:00.000Z");
  });

  it("si el aviso cae antes de medianoche pasa al día anterior", () => {
    expect(computeRemindAt("1h", "2026-10-01", "00:30")).toBe(localDateTimeToUtcIso("2026-09-30", "23:30"));
  });

  it("avisos por día para tareas sin hora", () => {
    expect(computeRemindAt("day_8am", "2026-10-01", null)).toBe("2026-10-01T14:00:00.000Z");
    expect(computeRemindAt("day_before_8pm", "2026-10-01", null)).toBe("2026-10-01T02:00:00.000Z");
  });

  it("los avisos relativos sin hora no aplican", () => {
    expect(computeRemindAt("10m", "2026-10-01", null)).toBeNull();
    expect(reminderOptionsFor(false)).not.toContain("10m");
  });
});
