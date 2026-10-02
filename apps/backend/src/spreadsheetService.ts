import { access, mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import ExcelJS from "exceljs";
import type { SpreadsheetDescriptor, TimeEntry, Tour } from "../../../packages/shared/src/index.js";

const thin = { style: "thin" as const, color: { argb: "FF707070" } };
const medium = { style: "medium" as const, color: { argb: "FF505050" } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

export class SpreadsheetService {
  constructor(private readonly dataDirectory = join(process.cwd(), "data", "spreadsheets")) {}
  filePath(userId: string, year: number, month: number): string { return join(this.dataDirectory, String(year), String(month).padStart(2, "0"), `${userId}.xlsx`); }

  async generate(userId: string, year: number, month: number, entries: TimeEntry[], userName = userId): Promise<string> {
    const path = this.filePath(userId, year, month);
    await mkdir(dirname(path), { recursive: true });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Arbeitszeitverwaltung";
    workbook.subject = `Arbeitszeitnachweis ${month}/${year}`;
    workbook.title = `Arbeitszeitnachweis ${userName} ${month}/${year}`;
    const worksheet = workbook.addWorksheet("Druckvorlage", { properties: { defaultRowHeight: 16 } });
    this.buildTemplate(worksheet, userName, year, month, entries);
    await workbook.xlsx.writeFile(path);
    return path;
  }

  async list(userIds: string[]): Promise<SpreadsheetDescriptor[]> {
    const result: SpreadsheetDescriptor[] = [];
    for (const userId of userIds) {
      let years: string[] = [];
      try { years = await readdir(this.dataDirectory); } catch { continue; }
      for (const year of years.filter((value) => /^\d{4}$/.test(value))) {
        let months: string[] = [];
        try { months = await readdir(join(this.dataDirectory, year)); } catch { continue; }
        for (const month of months.filter((value) => /^(0[1-9]|1[0-2])$/.test(value))) {
          const fileName = `${userId}.xlsx`;
          try { await access(this.filePath(userId, Number(year), Number(month))); } catch { continue; }
          result.push({ userId, year: Number(year), month: Number(month), fileName, exists: true });
        }
      }
    }
    return result;
  }

  async remove(userId: string, year: number, month: number): Promise<void> { await unlink(this.filePath(userId, year, month)); }

  private buildTemplate(worksheet: ExcelJS.Worksheet, userName: string, year: number, month: number, entries: TimeEntry[]): void {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days = new Map<number, TimeEntry[]>();
    for (const entry of entries) {
      const day = Number(entry.date.slice(8, 10));
      if (day < 1 || day > daysInMonth) continue;
      const dayEntries = days.get(day) ?? [];
      dayEntries.push(entry);
      days.set(day, dayEntries);
    }

    worksheet.columns = [6, 7.43, 7.43, 7.43, 8.43, 7.43, 7.43, 7.43, 8.43, 7.43, 7.43, 7.43, 8.43, 11, 34].map((width) => ({ width }));
    worksheet.properties.defaultRowHeight = 16;
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 2,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 },
      showGridLines: false,
      horizontalDpi: 300,
      verticalDpi: 300,
      printArea: "A1:O53"
    };
    worksheet.views = [{ state: "normal", showGridLines: false }];
    const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));

    worksheet.mergeCells("A1:O1");
    worksheet.mergeCells("A2:F2");
    worksheet.mergeCells("G2:J2");
    worksheet.mergeCells("K2:O2");
    worksheet.mergeCells("A4:A5");
    worksheet.mergeCells("B4:E4");
    worksheet.mergeCells("F4:I4");
    worksheet.mergeCells("J4:M4");
    worksheet.mergeCells("N4:N5");
    worksheet.mergeCells("O4:O5");
    worksheet.mergeCells("A22:M22");
    worksheet.mergeCells("O23:O24");
    worksheet.mergeCells("A26:F26");
    worksheet.mergeCells("G26:J26");
    worksheet.mergeCells("K26:O26");
    worksheet.mergeCells("A28:A29");
    worksheet.mergeCells("B28:E28");
    worksheet.mergeCells("F28:I28");
    worksheet.mergeCells("J28:M28");
    worksheet.mergeCells("N28:N29");
    worksheet.mergeCells("O28:O29");
    worksheet.mergeCells("A45:M45");
    worksheet.mergeCells("A47:O47");
    worksheet.mergeCells("A48:O48");
    worksheet.mergeCells("A49:O49");
    worksheet.mergeCells("B52:F52");
    worksheet.mergeCells("J52:O52");
    worksheet.mergeCells("B53:F53");
    worksheet.mergeCells("J53:O53");

    worksheet.getCell("A1").value = "ARBEITSZEITNACHWEIS (1. Arbeitszeitgesetz (ArbZG))";
    worksheet.getCell("A2").value = `Name Arbeitnehmer/in: ${userName}`;
    worksheet.getCell("G2").value = `Monat: ${monthName}`;
    worksheet.getCell("K2").value = `Jahr: ${year}`;
    this.setTableHeader(worksheet, 4);
    this.setTableHeader(worksheet, 28);

    const firstHalfMinutes: number[] = [];
    const secondHalfMinutes: number[] = [];
    for (let day = 1; day <= 31; day += 1) {
      const row = day <= 16 ? day + 5 : day + 13;
      const dayEntries = day <= daysInMonth ? days.get(day) ?? [] : [];
      const minuteTotal = this.setDayRow(worksheet, row, day <= daysInMonth ? day : null, dayEntries);
      (day <= 16 ? firstHalfMinutes : secondHalfMinutes).push(minuteTotal);
    }

    worksheet.getCell("A22").value = "ÜBERTRAG (Tage 1–16):";
    this.styleSummaryRow(worksheet, 22);
    worksheet.getCell("N22").value = { formula: "SUM(N6:N21)", result: firstHalfMinutes.reduce((total, value) => total + value, 0) / 1440 };
    worksheet.getCell("N22").numFmt = "[h]:mm";
    worksheet.getCell("O23").value = "Grund, Ursache, Bemerkungen (z. B. Urlaub, Krankheit, sonstige Abwesenheit)";
    worksheet.getCell("O23").font = { name: "Arial", size: 8 };
    worksheet.getCell("O23").alignment = { vertical: "top", wrapText: true };
    worksheet.getCell("O23").border = { left: medium, right: medium, top: thin, bottom: thin };

    worksheet.getCell("A26").value = `Name Arbeitnehmer/in: ${userName}`;
    worksheet.getCell("G26").value = `Monat: ${monthName}`;
    worksheet.getCell("K26").value = `Jahr: ${year}`;
    worksheet.getCell("A45").value = "GESAMTSUMME:";
    this.styleSummaryRow(worksheet, 45);
    worksheet.getCell("N45").value = { formula: "N22+SUM(N30:N44)", result: [...firstHalfMinutes, ...secondHalfMinutes].reduce((total, value) => total + value, 0) / 1440 };
    worksheet.getCell("N45").numFmt = "[h]:mm";
    worksheet.getCell("A47").value = "Beachten Sie im Übrigen die Aufzeichnungspflichten des Arbeitszeitgesetzes.";
    worksheet.getCell("A48").value = "• Die Arbeitszeit ist spätestens innerhalb von 7 Kalendertagen nach der Arbeitsleistung aufzuzeichnen.";
    worksheet.getCell("A49").value = "• Die Aufzeichnungen sind mindestens zwei Jahre aufzubewahren.";
    worksheet.getCell("B52").value = "____________________________";
    worksheet.getCell("J52").value = "____________________________";
    worksheet.getCell("B53").value = "Datum";
    worksheet.getCell("J53").value = "Unterschrift Arbeitnehmer/in";

    for (const rowNumber of [1, 2, 26, 47, 48, 49, 52, 53]) {
      const row = worksheet.getRow(rowNumber);
      for (let column = 1; column <= 15; column += 1) {
        const cell = row.getCell(column);
        cell.font = { name: "Arial", size: rowNumber === 1 ? 10 : 8, bold: rowNumber === 1 || rowNumber >= 47 };
        cell.alignment = { vertical: "middle", wrapText: true };
      }
    }
    worksheet.getCell("A1").font = { name: "Arial", size: 10, bold: true };
    worksheet.getRow(1).height = 21;
    worksheet.getRow(2).height = 20;
    worksheet.getRow(23).height = 24;
    worksheet.getRow(24).height = 24;
    worksheet.getRow(25).height = 8;
    worksheet.getRow(26).height = 20;
    worksheet.getRow(27).height = 8;
    worksheet.getRow(47).height = 18;
    worksheet.getRow(48).height = 18;
    worksheet.getRow(49).height = 18;
    worksheet.getRow(52).height = 22;
    worksheet.getRow(53).height = 18;
  }

  private setTableHeader(worksheet: ExcelJS.Worksheet, topRow: number): void {
    const secondRow = topRow + 1;
    const values = ["Kal. Tag", "FRÜHSCHICHT", "MITTAGSCHICHT", "RÜCKSCHICHT", "TAGESUMME", "BEMERKUNGEN"];
    const addresses = [`A${topRow}`, `B${topRow}`, `F${topRow}`, `J${topRow}`, `N${topRow}`, `O${topRow}`];
    addresses.forEach((address, index) => { worksheet.getCell(address).value = values[index]; });
    const subheaders = ["Tour", "Start", "Ende", "SUMME"];
    for (const startColumn of [2, 6, 10]) {
      subheaders.forEach((value, index) => { worksheet.getCell(secondRow, startColumn + index).value = value; });
    }
    for (let row = topRow; row <= secondRow; row += 1) {
      for (let column = 1; column <= 15; column += 1) {
        const cell = worksheet.getCell(row, column);
        cell.font = { name: "Arial", size: 8, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = border;
      }
    }
    worksheet.getRow(topRow).height = 22;
    worksheet.getRow(secondRow).height = 18;
  }

  private setDayRow(worksheet: ExcelJS.Worksheet, row: number, day: number | null, entries: TimeEntry[]): number {
    const byTour = new Map(entries.map((entry) => [entry.tour, entry]));
    let totalMinutes = 0;
    worksheet.getCell(row, 1).value = day;
    for (const tour of ["tour-1", "tour-2", "tour-3"] as const) {
      const entry = byTour.get(tour);
      const startColumn = this.startColumn(tour);
      if (entry?.startedAt) {
        const minutes = Math.max(0, Math.round(entry.durationMinutes || entry.decimalHours * 60));
        totalMinutes += minutes;
        worksheet.getCell(row, startColumn).value = entry.tourNumber;
        worksheet.getCell(row, startColumn + 1).value = this.timeValue(entry.startedAt);
        worksheet.getCell(row, startColumn + 2).value = entry.endedAt ? this.timeValue(entry.endedAt) : null;
        worksheet.getCell(row, startColumn + 3).value = minutes / 1440;
        worksheet.getCell(row, startColumn + 3).numFmt = "[h]:mm";
        worksheet.getCell(row, startColumn + 1).numFmt = "hh:mm";
        worksheet.getCell(row, startColumn + 2).numFmt = "hh:mm";
      }
    }
    const dayFormulaRow = `SUM(E${row},I${row},M${row})`;
    worksheet.getCell(row, 14).value = { formula: dayFormulaRow, result: totalMinutes / 1440 };
    worksheet.getCell(row, 14).numFmt = "[h]:mm";
    const dayStatusLabels: Record<string, string> = { K: "Krank", U: "Urlaub", F: "Feiertag", UF: "unbezahlt frei" };
    const notes = [...new Set(entries.flatMap((entry) => [dayStatusLabels[entry.dayStatus], entry.remark]).filter((value): value is string => Boolean(value)))];
    worksheet.getCell(row, 15).value = notes.join(" | ");
    for (let column = 1; column <= 15; column += 1) {
      const cell = worksheet.getCell(row, column);
      cell.font = { name: "Arial", size: 8 };
      cell.alignment = { horizontal: column === 15 ? "left" : "center", vertical: "middle", wrapText: column === 15 };
      cell.border = { top: thin, bottom: thin, left: column === 1 || column === 14 || column === 15 ? medium : thin, right: column === 1 || column === 13 || column === 14 || column === 15 ? medium : thin };
    }
    worksheet.getCell(row, 14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    worksheet.getRow(row).height = 17;
    return totalMinutes;
  }

  private styleSummaryRow(worksheet: ExcelJS.Worksheet, row: number): void {
    for (let column = 1; column <= 15; column += 1) {
      const cell = worksheet.getCell(row, column);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { horizontal: column === 1 ? "right" : "center", vertical: "middle" };
      cell.border = { top: thin, bottom: thin, left: column === 1 || column === 14 || column === 15 ? medium : thin, right: column === 1 || column === 14 || column === 15 ? medium : thin };
    }
    worksheet.getCell(row, 14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    worksheet.getRow(row).height = 20;
  }

  private startColumn(tour: Tour): number { return ({ "tour-1": 2, "tour-2": 6, "tour-3": 10 })[tour]; }
  private timeValue(value: string): number {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minutes = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return (hours * 60 + minutes) / (24 * 60);
  }
}