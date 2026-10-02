import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import type { RowDataPacket } from "mysql2/promise";
import { db, initializeTimeTrackingDatabase } from "../apps/backend/src/db.js";
import { initializeAccountsDatabase } from "../apps/accounts/src/db.js";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  password_hash: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  salutation: string;
  first_name: string;
  last_name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  mobile: string;
  sick_hours: number;
  vacation_hours: number;
  license_plate: string;
  electric_car: number;
};

type PasswordToken = {
  token: string;
  user_id: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
};

type TimeEntry = {
  id: string;
  user_id: string;
  date: string;
  tour: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  day_status: string;
  remark: string;
  tour_number: number;
  decimal_hours: number;
  duration_minutes: number;
};

async function migrate(): Promise<void> {
  const accountsSource = new DatabaseSync("data/accounts.db", { readOnly: true });
  const timeTrackingSource = new DatabaseSync("data/app.db", { readOnly: true });

  try {
    const users = accountsSource.prepare("SELECT * FROM users").all() as User[];
    const profiles = accountsSource.prepare("SELECT * FROM user_profiles").all() as Profile[];
    const tokens = accountsSource.prepare("SELECT * FROM password_tokens").all() as PasswordToken[];
    const entries = timeTrackingSource.prepare("SELECT * FROM time_entries").all() as TimeEntry[];

    await initializeAccountsDatabase();
    await initializeTimeTrackingDatabase();

    const connection = await db.getConnection();
    const userIdMap = new Map<string, string>();
    try {
      await connection.beginTransaction();

      for (const user of users) {
        const [existingUsers] = await connection.execute<(RowDataPacket & { id: string })[]>(
          "SELECT id FROM users WHERE id = ? OR email = ? LIMIT 1",
          [user.id, user.email]
        );
        const userId = existingUsers[0]?.id ?? user.id;
        userIdMap.set(user.id, userId);
        await connection.execute(`
          INSERT INTO users (id, name, email, role, status, password_hash, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name), email = VALUES(email), role = VALUES(role),
            status = VALUES(status), password_hash = VALUES(password_hash), created_at = VALUES(created_at)
        `, [userId, user.name, user.email, user.role, user.status, user.password_hash, user.created_at]);
      }

      for (const profile of profiles) {
        const userId = userIdMap.get(profile.user_id);
        if (!userId) continue;
        await connection.execute(`
          INSERT INTO user_profiles (user_id, salutation, first_name, last_name, street, house_number, postal_code, city, mobile, sick_hours, vacation_hours, license_plate, electric_car)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            salutation = VALUES(salutation), first_name = VALUES(first_name), last_name = VALUES(last_name),
            street = VALUES(street), house_number = VALUES(house_number), postal_code = VALUES(postal_code),
            city = VALUES(city), mobile = VALUES(mobile), sick_hours = VALUES(sick_hours),
            vacation_hours = VALUES(vacation_hours), license_plate = VALUES(license_plate), electric_car = VALUES(electric_car)
        `, [userId, profile.salutation, profile.first_name, profile.last_name, profile.street, profile.house_number, profile.postal_code, profile.city, profile.mobile, profile.sick_hours, profile.vacation_hours, profile.license_plate, profile.electric_car]);
      }

      for (const user of users) {
        const userId = userIdMap.get(user.id);
        if (userId) await connection.execute("DELETE FROM password_tokens WHERE user_id = ?", [userId]);
      }

      for (const token of tokens) {
        const userId = userIdMap.get(token.user_id);
        if (!userId) continue;
        await connection.execute(`
          INSERT INTO password_tokens (token, user_id, purpose, expires_at, used_at)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), purpose = VALUES(purpose), expires_at = VALUES(expires_at), used_at = VALUES(used_at)
        `, [token.token, userId, token.purpose, token.expires_at, token.used_at]);
      }

      for (const entry of entries) {
        const userId = userIdMap.get(entry.user_id) ?? entry.user_id;
        const id = `${userId}:${entry.date}:${entry.tour}`;
        await connection.execute(`
          INSERT INTO time_entries (id, user_id, date, tour, started_at, ended_at, status, day_status, remark, tour_number, decimal_hours, duration_minutes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            id = VALUES(id), user_id = VALUES(user_id), started_at = VALUES(started_at), ended_at = VALUES(ended_at),
            status = VALUES(status), day_status = VALUES(day_status), remark = VALUES(remark),
            tour_number = VALUES(tour_number), decimal_hours = VALUES(decimal_hours), duration_minutes = VALUES(duration_minutes)
        `, [id, userId, entry.date, entry.tour, entry.started_at, entry.ended_at, entry.status, entry.day_status, entry.remark, entry.tour_number, entry.decimal_hours, entry.duration_minutes]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    console.log(`SQLite-Import abgeschlossen: ${users.length} Nutzer, ${profiles.length} Profile, ${tokens.length} Tokens, ${entries.length} Zeiteinträge.`);
  } finally {
    accountsSource.close();
    timeTrackingSource.close();
    await db.end();
  }
}

await migrate();