import { useEffect, useState } from "react";
import type { TimeEntry, Tour } from "../../../../packages/shared/src/index.js";
import { getDayStatusText, isDayStatusSelected, type DayStatus } from "../dayStatus.js";

const today = new Date().toISOString().slice(0, 10);
const tours: Tour[] = ["tour-1", "tour-2", "tour-3"];
const lastTourNumberKey = "last-tour-number";

function tourNumberStorageKey(tour: Tour) { return `tour-number:${tour}`; }
function storedTourNumber(tour: Tour, fallback: number, useDefault: boolean) {
  const assignedValue = localStorage.getItem(tourNumberStorageKey(tour));
  if (assignedValue) return assignedValue;
  if (useDefault) return localStorage.getItem(lastTourNumberKey) ?? String(fallback || "");
  return String(fallback || "");
}
function parseTourNumber(value: string): number | null {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  return Number(normalized);
}
function tourLabel(tour: Tour) {
  return { "tour-1": "Frühtour", "tour-2": "Mittagstour", "tour-3": "Rücktour" }[tour];
}

export function TimeTrackingPage({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tourNumbers, setTourNumbers] = useState<Record<Tour, string>>({ "tour-1": "", "tour-2": "", "tour-3": "" });
  const [dayStatus, setDayStatus] = useState<DayStatus>("");
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  async function loadEntries() {
    const response = await fetch(`/api/time-entries?date=${today}`, { credentials: "include" });
    const data = await response.json() as { entries: TimeEntry[] };
    setEntries(data.entries);
    setTourNumbers(Object.fromEntries(data.entries.map((entry) => [entry.tour, storedTourNumber(entry.tour, entry.tourNumber, !entry.startedAt)])) as Record<Tour, string>);
    const statusEntry = data.entries.find((entry) => entry.dayStatus);
    const remarkFromApi = data.entries.find((entry) => entry.remark)?.remark ?? "";
    const statusFromApi = statusEntry?.dayStatus ?? "";
    setDayStatus(statusFromApi);
    localStorage.removeItem("day-status");
    setRemark(remarkFromApi);
  }
  useEffect(() => { void loadEntries(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function updateTourNumber(entry: TimeEntry, rawValue: string) {
    setTourNumbers((current) => ({ ...current, [entry.tour]: rawValue }));
    const value = parseTourNumber(rawValue);
    if (value === null) return;
    localStorage.setItem(tourNumberStorageKey(entry.tour), String(value));
    localStorage.setItem(lastTourNumberKey, String(value));
    if (!entry.startedAt) return;
    await fetch(`/api/time-entries/${encodeURIComponent(entry.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tourNumber: value }) });
  }

  async function updateRemark(nextRemark: string) {
    setRemark(nextRemark);
    try {
      const response = await fetch("/api/day-remark", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, remark: nextRemark })
      });
      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? "Die Bemerkung konnte nicht gespeichert werden.");
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Die Bemerkung konnte nicht gespeichert werden.");
    }
  }

  async function toggle(entry: TimeEntry) {
    if (isDayStatusSelected(dayStatus)) {
      setMessage(`Für diesen Tag ist ${getDayStatusText(dayStatus)} ausgewählt. Keine Zeiterfassung möglich.`);
      return;
    }
    const running = Boolean(entry.startedAt && !entry.endedAt);
    const rawTourNumber = tourNumbers[entry.tour] || String(entry.tourNumber || "");
    const tourNumber = parseTourNumber(rawTourNumber);
    if (!running && tourNumber === null) { setMessage("Bitte eine positive ganze Tournummer eingeben."); return; }
    const remarkForEntry = dayStatus ? getDayStatusText(dayStatus) : remark;
    const response = await fetch(running ? `/api/time-entries/${encodeURIComponent(entry.id)}/stop` : "/api/time-entries", {
      method: "POST",
      credentials: "include",
      headers: running ? undefined : { "Content-Type": "application/json" },
      body: running ? undefined : JSON.stringify({ date: today, tour: entry.tour, dayStatus, remark: remarkForEntry, tourNumber, decimalHours: 0 })
    });
    if (!response.ok) { const error = await response.json() as { error?: string }; setMessage(error.error ?? "Aktion fehlgeschlagen"); return; }
    setMessage("");
    await loadEntries();
  }

  const totalMinutes = Math.round(entries.reduce((sum, entry) => {
    return sum + currentDurationMinutes(entry, now);
  }, 0));
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const dayBlocked = isDayStatusSelected(dayStatus);

  return <>
    <section className="summary"><span>Kumulierte Zeit</span><strong>{totalHours}<small> h </small>{remainingMinutes}<small> min</small></strong><span className="summary-note">Alle drei Erfassungen zusammen</span></section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">DEIN TAG</p><h2>Touren</h2></div><span className="status-dot">Live</span></div>
      <div className="entries">{entries.map((entry) => <EntryRow key={entry.tour} entry={entry} tourNumber={tourNumbers[entry.tour] ?? ""} now={now} blocked={dayBlocked} onTourNumberChange={(value) => void updateTourNumber(entry, value)} onToggle={() => void toggle(entry)} />)}</div>
      <label className="day-status-field">
        <span>Bemerkung</span>
        <input value={remark} onChange={(event) => setRemark(event.target.value)} onBlur={(event) => void updateRemark(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } }} placeholder={dayStatus ? getDayStatusText(dayStatus) : "Status, Umleitungen, besondere Vorkommnisse"} aria-label="Bemerkung" />
      </label>
      {dayBlocked && <p className="day-status-note">{getDayStatusText(dayStatus)} ausgewählt – für diesen Tag findet keine Zeiterfassung statt.</p>}
      {message && <p className="error">{message}</p>}
    </section>
    <section className="panel export"><div><p className="eyebrow">MONATSREPORT</p><h2>Excel-Tabelle</h2><p>Erstelle oder lade deinen Nachweis für diesen Monat herunter.</p></div><a className="button" href={`/api/spreadsheets/download?userId=${encodeURIComponent(userId)}&year=${today.slice(0, 4)}&month=${Number(today.slice(5, 7))}`}>Download</a></section>
  </>;
}

function EntryRow({ entry, tourNumber, now, blocked, onTourNumberChange, onToggle }: { entry: TimeEntry; tourNumber: string; now: number; blocked: boolean; onTourNumberChange: (value: string) => void; onToggle: () => void }) {
  const running = Boolean(entry.startedAt && !entry.endedAt);
  const completed = Boolean(entry.endedAt);
  const disabled = blocked || completed;
  return <article className={`entry ${running ? "running" : ""}`}><div className="tour-mark">{entry.tour.replace("tour-", "0")}</div><div className="entry-info"><strong>{tourLabel(entry.tour)}</strong><span>{formatEntry(entry)}</span></div><label className="tour-number-field"><span>Tour</span><input type="number" inputMode="numeric" step="1" min="1" value={tourNumber} placeholder="1" onChange={(event) => onTourNumberChange(event.target.value)} aria-label={`Tournummer für ${tourLabel(entry.tour)}`} disabled={blocked} /></label><label className="decimal-field"><span>Stunden</span><input type="text" inputMode="decimal" value={formatHours(currentDurationMinutes(entry, now))} readOnly aria-label={`Kumulierte Stunden für ${tourLabel(entry.tour)}`} /></label><button className={running ? "stop" : completed ? "completed" : "start"} onClick={onToggle} disabled={disabled}>{running ? "Stop" : completed ? "Erledigt" : "Start"}</button></article>;
}

function currentDurationMinutes(entry: TimeEntry, now: number) {
  if (!entry.startedAt) return entry.durationMinutes;
  const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now;
  return Math.max(0, Math.round((end - new Date(entry.startedAt).getTime()) / 60000));
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

function formatEntry(entry: TimeEntry) {
  if (!entry.startedAt) return "Noch nicht gestartet";
  const times = `${new Date(entry.startedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}${entry.endedAt ? ` – ${new Date(entry.endedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : ""}`;
  return times;
}
