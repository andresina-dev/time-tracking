import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
const dbPath = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "app.db");
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    tour TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    status TEXT NOT NULL,
    day_status TEXT NOT NULL DEFAULT '',
    remark TEXT NOT NULL DEFAULT '',
    tour_number INTEGER NOT NULL,
    decimal_hours REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    UNIQUE(user_id, date, tour)
  );
`);
for (const column of ["day_status", "remark"]) {
    try {
        db.prepare(`SELECT ${column} FROM time_entries LIMIT 1;`).get();
    }
    catch {
        db.exec(`ALTER TABLE time_entries ADD COLUMN ${column} TEXT NOT NULL DEFAULT '';`);
    }
}
