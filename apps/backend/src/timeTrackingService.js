import { db } from "./db.js";
const tours = ["tour-1", "tour-2", "tour-3"];
function toEntry(row) {
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
    list(userId, date) {
        return tours.map((tour) => this.findEntry(userId, date, tour) ?? this.emptyEntry(userId, date, tour));
    }
    /** Liefert alle in der DB gespeicherten Einträge eines Nutzers in einem Datumsbereich (für den Excel-Export). */
    listRange(userId, fromDate, toDate) {
        const rows = db.prepare("SELECT * FROM time_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, tour").all(userId, fromDate, toDate);
        return rows.map(toEntry);
    }
    start(userId, input) {
        const current = this.findEntry(userId, input.date, input.tour);
        if (current?.startedAt && !current.endedAt)
            throw new Error("Diese Tour läuft bereits.");
        if (current?.endedAt)
            throw new Error("Diese Tour wurde heute bereits abgeschlossen.");
        if (input.dayStatus)
            throw new Error("Für diesen Tag ist eine Tagesoption ausgewählt. Keine Zeiterfassung möglich.");
        const entry = { id: this.key(userId, input.date, input.tour), userId, date: input.date, tour: input.tour, startedAt: berlinTimestamp(), endedAt: null, status: "draft", dayStatus: input.dayStatus, remark: input.remark, tourNumber: input.tourNumber, decimalHours: input.decimalHours, durationMinutes: 0 };
        this.save(entry);
        return entry;
    }
    stop(userId, date, tour) {
        const current = this.findEntry(userId, date, tour);
        if (!current?.startedAt || current.endedAt)
            throw new Error("Für diese Tour läuft keine Zeiterfassung.");
        const endedAt = new Date();
        const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - new Date(current.startedAt).getTime()) / 60000));
        const entry = { ...current, endedAt: berlinTimestamp(endedAt), durationMinutes, decimalHours: durationMinutes / 60, status: "submitted" };
        this.save(entry);
        return entry;
    }
    update(userId, id, changes) {
        const current = this.findById(id);
        if (!current || current.userId !== userId)
            throw new Error("Zeiteintrag nicht gefunden.");
        if (current.status === "approved")
            throw new Error("Freigegebene Einträge können nicht direkt geändert werden.");
        const entry = { ...current, ...changes };
        if (entry.startedAt && entry.endedAt)
            entry.durationMinutes = Math.max(0, Math.round((new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 60000));
        this.save(entry);
        return entry;
    }
    key(userId, date, tour) { return `${userId}:${date}:${tour}`; }
    emptyEntry(userId, date, tour) { return { id: this.key(userId, date, tour), userId, date, tour, startedAt: null, endedAt: null, status: "draft", dayStatus: "", remark: "", tourNumber: 1, decimalHours: 0, durationMinutes: 0 }; }
    findEntry(userId, date, tour) {
        const row = db.prepare("SELECT * FROM time_entries WHERE user_id = ? AND date = ? AND tour = ?").get(userId, date, tour);
        return row ? toEntry(row) : undefined;
    }
    findById(id) {
        const row = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(id);
        return row ? toEntry(row) : undefined;
    }
    save(entry) {
        db.prepare(`
      INSERT INTO time_entries (id, user_id, date, tour, started_at, ended_at, status, day_status, remark, tour_number, decimal_hours, duration_minutes)
      VALUES (@id, @user_id, @date, @tour, @started_at, @ended_at, @status, @day_status, @remark, @tour_number, @decimal_hours, @duration_minutes)
      ON CONFLICT(id) DO UPDATE SET
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        status = excluded.status,
        day_status = excluded.day_status,
        remark = excluded.remark,
        tour_number = excluded.tour_number,
        decimal_hours = excluded.decimal_hours,
        duration_minutes = excluded.duration_minutes
    `).run({
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
function berlinTimestamp(date = new Date()) {
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
    if (!offsetMatch)
        throw new Error(`Unbekannter Zeitzonenoffset: ${offsetText}`);
    const [, sign = "+", hours = "00", minutes = "00"] = offsetMatch;
    const offset = `${sign}${hours.padStart(2, "0")}:${minutes}`;
    return `${local}.${String(date.getMilliseconds()).padStart(3, "0")}${offset}`;
}
