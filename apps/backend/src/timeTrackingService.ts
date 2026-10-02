import type { StartEntry, TimeEntry, Tour, UpdateEntry } from "../../../packages/shared/src/index.js";
import type { RowDataPacket } from "mysql2";
import { db } from "./db.js";

const tours: Tour[] = ["tour-1", "tour-2", "tour-3"];

type Row = RowDataPacket & {
  id: string;
  user_id: string;
  date: string;
  tour: Tour;
  started_at: string | null;
  ended_at: string | null;
  status: TimeEntry["status"];
  day_status: string;
  remark: string;
  tour_number: number;
  decimal_hours: number;
  duration_minutes: number;
};

function toEntry(row: Row): TimeEntry {
  const dayStatus = row.day_status === "K" || row.day_status === "U" || row.day_status === "F" || row.day_status === "UF" ? row.day_status : "";
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    tour: row.tour,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    dayStatus,
    remark: row.remark ?? "",
    tourNumber: row.tour_number,
    decimalHours: row.decimal_hours,
    durationMinutes: row.duration_minutes
  };
}

export class TimeTrackingService {
  async list(userId: string, date: string): Promise<TimeEntry[]> {
    return Promise.all(tours.map(async (tour) => await this.findEntry(userId, date, tour) ?? this.emptyEntry(userId, date, tour)));
  }

  /** Liefert alle in der DB gespeicherten Einträge eines Nutzers in einem Datumsbereich (für den Excel-Export). */
  async listRange(userId: string, fromDate: string, toDate: string): Promise<TimeEntry[]> {
    const [rows] = await db.execute<Row[]>("SELECT * FROM time_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, tour", [userId, fromDate, toDate]);
    return rows.map(toEntry);
  }

  async start(userId: string, input: StartEntry): Promise<TimeEntry> {
    const current = await this.findEntry(userId, input.date, input.tour);
    if (current?.startedAt && !current.endedAt) throw new Error("Diese Tour läuft bereits.");
    if (current?.endedAt) throw new Error("Diese Tour wurde heute bereits abgeschlossen.");
    if (input.dayStatus) throw new Error("Für diesen Tag ist eine Tagesoption ausgewählt. Keine Zeiterfassung möglich.");
    const entry: TimeEntry = { id: this.key(userId, input.date, input.tour), userId, date: input.date, tour: input.tour, startedAt: berlinTimestamp(), endedAt: null, status: "draft", dayStatus: input.dayStatus, remark: input.remark, tourNumber: input.tourNumber, decimalHours: input.decimalHours, durationMinutes: 0 };
    await this.save(entry);
    return entry;
  }

  async stop(userId: string, date: string, tour: Tour): Promise<TimeEntry> {
    const current = await this.findEntry(userId, date, tour);
    if (!current?.startedAt || current.endedAt) throw new Error("Für diese Tour läuft keine Zeiterfassung.");
    const endedAt = new Date();
    const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - new Date(current.startedAt).getTime()) / 60000));
    const entry: TimeEntry = { ...current, endedAt: berlinTimestamp(endedAt), durationMinutes, decimalHours: durationMinutes / 60, status: "submitted" };
    await this.save(entry);
    return entry;
  }

  async update(userId: string, id: string, changes: UpdateEntry): Promise<TimeEntry> {
    const current = await this.findById(id);
    if (!current || current.userId !== userId) throw new Error("Zeiteintrag nicht gefunden.");
    if (current.status === "approved") throw new Error("Freigegebene Einträge können nicht direkt geändert werden.");
    const entry = { ...current, ...changes };
    if (entry.startedAt && entry.endedAt) {
      const startedAt = new Date(entry.startedAt).getTime();
      const endedAt = new Date(entry.endedAt).getTime();
      if (endedAt < startedAt) throw new Error("Die Endzeit muss nach der Startzeit liegen.");
      entry.durationMinutes = Math.round((endedAt - startedAt) / 60000);
    }
    await this.save(entry);
    return entry;
  }

  async updateRemark(userId: string, date: string, remark: string): Promise<void> {
    const entries = await this.ensureDayEntries(userId, date);
    for (const entry of entries) await db.execute("UPDATE time_entries SET remark = ? WHERE id = ? AND user_id = ?", [remark, entry.id, userId]);
  }

  async updateDayStatus(userId: string, date: string, dayStatus: TimeEntry["dayStatus"]): Promise<void> {
    const entries = await this.ensureDayEntries(userId, date);
    for (const entry of entries) await db.execute("UPDATE time_entries SET day_status = ? WHERE id = ? AND user_id = ?", [dayStatus, entry.id, userId]);
  }

  private async ensureDayEntries(userId: string, date: string): Promise<Array<{ id: string }>> {
    const entries: Array<{ id: string }> = [];
    for (const tour of tours) {
      const existing = await this.findEntry(userId, date, tour);
      const entry = existing ?? this.emptyEntry(userId, date, tour);
      if (!existing) await this.save(entry);
      entries.push({ id: entry.id });
    }
    return entries;
  }

  private key(userId: string, date: string, tour: Tour): string { return `${userId}:${date}:${tour}`; }
  private emptyEntry(userId: string, date: string, tour: Tour): TimeEntry { return { id: this.key(userId, date, tour), userId, date, tour, startedAt: null, endedAt: null, status: "draft", dayStatus: "", remark: "", tourNumber: 1, decimalHours: 0, durationMinutes: 0 }; }

  private async findEntry(userId: string, date: string, tour: Tour): Promise<TimeEntry | undefined> {
    const [rows] = await db.execute<Row[]>("SELECT * FROM time_entries WHERE user_id = ? AND date = ? AND tour = ?", [userId, date, tour]);
    const row = rows[0];
    return row ? toEntry(row) : undefined;
  }

  private async findById(id: string): Promise<TimeEntry | undefined> {
    const [rows] = await db.execute<Row[]>("SELECT * FROM time_entries WHERE id = ?", [id]);
    const row = rows[0];
    return row ? toEntry(row) : undefined;
  }

  private async save(entry: TimeEntry): Promise<void> {
    await db.execute(`
      INSERT INTO time_entries (id, user_id, date, tour, started_at, ended_at, status, day_status, remark, tour_number, decimal_hours, duration_minutes)
      VALUES (:id, :user_id, :date, :tour, :started_at, :ended_at, :status, :day_status, :remark, :tour_number, :decimal_hours, :duration_minutes)
      ON DUPLICATE KEY UPDATE
        started_at = VALUES(started_at),
        ended_at = VALUES(ended_at),
        status = VALUES(status),
        day_status = VALUES(day_status),
        remark = VALUES(remark),
        tour_number = VALUES(tour_number),
        decimal_hours = VALUES(decimal_hours),
        duration_minutes = VALUES(duration_minutes)
    `, {
      id: entry.id,
      user_id: entry.userId,
      date: entry.date,
      tour: entry.tour,
      started_at: entry.startedAt,
      ended_at: entry.endedAt,
      status: entry.status,
      day_status: entry.dayStatus,
      remark: entry.remark,
      tour_number: entry.tourNumber,
      decimal_hours: entry.decimalHours,
      duration_minutes: entry.durationMinutes
    });
  }
}

function berlinTimestamp(date = new Date()): string {
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(date).replace(" ", "T");
  const offsetText = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const offsetMatch = /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(offsetText);
  if (!offsetMatch) throw new Error(`Unbekannter Zeitzonenoffset: ${offsetText}`);
  const [, sign = "+", hours = "00", minutes = "00"] = offsetMatch;
  const offset = `${sign}${hours.padStart(2, "0")}:${minutes}`;
  return `${local}.${String(date.getMilliseconds()).padStart(3, "0")}${offset}`;
}