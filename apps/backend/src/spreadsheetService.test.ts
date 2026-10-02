import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { TimeEntry } from "../../../packages/shared/src/index.js";
import { SpreadsheetService } from "./spreadsheetService.js";

function timeFraction(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return (value.getUTCHours() * 60 + value.getUTCMinutes()) / 1440;
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return (date.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
  }
  throw new Error("Expected an Excel time value");
}

describe("SpreadsheetService", () => {
  it("writes all tours, daily totals, the monthly total, and the print template", async () => {
    const directory = await mkdtemp(join(tmpdir(), "time-tracking-spreadsheet-"));
    try {
      const service = new SpreadsheetService(directory);
      const entries: TimeEntry[] = [
        {
          id: "user-1:2026-09-03:tour-1",
          userId: "user-1",
          date: "2026-09-03",
          tour: "tour-1",
          startedAt: "2026-09-03T08:00:00+02:00",
          endedAt: "2026-09-03T10:00:00+02:00",
          status: "submitted",
          dayStatus: "",
          remark: "",
          tourNumber: 12,
          decimalHours: 2,
          durationMinutes: 120
        },
        {
          id: "user-1:2026-09-03:tour-2",
          userId: "user-1",
          date: "2026-09-03",
          tour: "tour-2",
          startedAt: "2026-09-03T11:00:00+02:00",
          endedAt: "2026-09-03T12:00:00+02:00",
          status: "submitted",
          dayStatus: "",
          remark: "Mittagsrunde",
          tourNumber: 15,
          decimalHours: 1,
          durationMinutes: 60
        },
        {
          id: "user-1:2026-09-18:tour-3",
          userId: "user-1",
          date: "2026-09-18",
          tour: "tour-3",
          startedAt: "2026-09-18T15:00:00+02:00",
          endedAt: "2026-09-18T15:30:00+02:00",
          status: "submitted",
          dayStatus: "",
          remark: "",
          tourNumber: 19,
          decimalHours: 0.5,
          durationMinutes: 30
        }
      ];

      const path = await service.generate("user-1", 2026, 9, entries, "Ada Beispiel");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(path);
      const worksheet = workbook.getWorksheet("Druckvorlage");
      expect(worksheet).toBeDefined();
      if (!worksheet) return;

      expect(worksheet.getCell("A2").value).toBe("Name Arbeitnehmer/in: Ada Beispiel");
      expect(worksheet.getCell("B8").value).toBe(12);
      expect(worksheet.getCell("F8").value).toBe(15);
      expect(timeFraction(worksheet.getCell("I8").value)).toBeCloseTo(60 / 1440);
      expect(worksheet.getCell("O8").value).toBe("Mittagsrunde");
      expect(worksheet.getCell("J31").value).toBe(19);
      expect(timeFraction(worksheet.getCell("M31").value)).toBeCloseTo(30 / 1440);

      expect(worksheet.getCell("N8").value).toMatchObject({ formula: "SUM(E8,I8,M8)" });
      expect(timeFraction((worksheet.getCell("N8").value as { result: unknown }).result)).toBeCloseTo(180 / 1440);
      expect(worksheet.getCell("N22").value).toMatchObject({ formula: "SUM(N6:N21)" });
      expect(timeFraction((worksheet.getCell("N22").value as { result: unknown }).result)).toBeCloseTo(180 / 1440);
      expect(worksheet.getCell("N45").value).toMatchObject({ formula: "N22+SUM(N30:N44)" });
      expect(timeFraction((worksheet.getCell("N45").value as { result: unknown }).result)).toBeCloseTo(210 / 1440);
      expect(worksheet.pageSetup.orientation).toBe("landscape");
      expect(worksheet.pageSetup.printArea).toBe("A1:O53");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});