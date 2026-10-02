import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { CreateUserInput, Role, User, UserProfile } from "../../../packages/shared/src/index.js";
import { db } from "./db.js";
import { EmailService } from "./emailService.js";

const SETUP_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "pending" | "active";
  password_hash: string | null;
  created_at: string;
};

type DbUserRow = RowDataPacket & UserRow;

type ProfileRow = RowDataPacket & {
  user_id: string;
  salutation: UserProfile["salutation"];
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

const emptyProfile: UserProfile = {
  salutation: "",
  firstName: "",
  lastName: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  mobile: "",
  sickHours: 0,
  vacationHours: 0,
  licensePlate: "",
  electricCar: false
};

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status };
}

export class AuthService {
  // Setup-/Reset-Links führen ins Frontend (eigener Login dort), nicht in die Nutzerverwaltung.
  constructor(private readonly appBaseUrl = process.env.FRONTEND_URL ?? "http://localhost:5173", private readonly email = new EmailService()) {}

  async bootstrapAdmin(): Promise<void> {
    const [rows] = await db.execute<(RowDataPacket & { count: number })[]>("SELECT COUNT(*) as count FROM users");
    if (rows[0].count > 0) return;
    const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@example.com";
    const { user, setupLink } = await this.createUser({ name: "Administrator", email, role: "admin", profile: emptyProfile });
    console.log(`[AuthService] Erster Admin-Account angelegt (${user.email}). Setup-Link:\n${setupLink}`);
  }

  async listUsers(): Promise<User[]> {
    const [rows] = await db.execute<DbUserRow[]>("SELECT * FROM users ORDER BY created_at DESC");
    return rows.map(toUser);
  }

  async searchUsers(query: string): Promise<User[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    const searchableFields = [
      "users.name",
      "users.email",
      "users.role",
      "user_profiles.salutation",
      "user_profiles.first_name",
      "user_profiles.last_name",
      "user_profiles.street",
      "user_profiles.house_number",
      "user_profiles.postal_code",
      "user_profiles.city",
      "user_profiles.mobile",
      "CAST(user_profiles.sick_hours AS TEXT)",
      "CAST(user_profiles.vacation_hours AS TEXT)",
      "user_profiles.license_plate",
      "CASE WHEN user_profiles.electric_car = 1 THEN 'ja' ELSE 'nein' END"
    ];
    const conditions = searchableFields.map((field) => `LOCATE(LOWER(?), LOWER(COALESCE(${field}, ''))) > 0`).join(" OR ");
    const [rows] = await db.execute<DbUserRow[]>(`
      SELECT DISTINCT users.* FROM users
      LEFT JOIN user_profiles ON user_profiles.user_id = users.id
      WHERE ${conditions}
      ORDER BY users.created_at DESC
    `, searchableFields.map(() => normalizedQuery));
    return rows.map(toUser);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [rows] = await db.execute<ProfileRow[]>("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
    const row = rows[0];
    if (!row) return { ...emptyProfile };
    return {
      salutation: row.salutation,
      firstName: row.first_name,
      lastName: row.last_name,
      street: row.street,
      houseNumber: row.house_number,
      postalCode: row.postal_code,
      city: row.city,
      mobile: row.mobile,
      sickHours: row.sick_hours,
      vacationHours: row.vacation_hours,
      licensePlate: row.license_plate,
      electricCar: Boolean(row.electric_car)
    };
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [rows] = await db.execute<DbUserRow[]>("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [rows] = await db.execute<DbUserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  }

  async createUser(input: CreateUserInput): Promise<{ user: User; setupLink: string }> {
    if (await this.findByEmail(input.email)) throw new Error("Diese E-Mail-Adresse wird bereits verwendet.");
    const row: UserRow = { id: randomUUID(), name: input.name, email: input.email, role: input.role, status: "pending", password_hash: null, created_at: new Date().toISOString() };
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("INSERT INTO users (id, name, email, role, status, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [row.id, row.name, row.email, row.role, row.status, row.password_hash, row.created_at]);
      await this.saveProfileRow(connection, row.id, input.profile);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    const token = await this.createToken(row.id, "setup", SETUP_TOKEN_TTL_MS);
    const setupLink = `${this.appBaseUrl}/set-password?token=${token}`;
    void this.email.sendAccountSetup(row.email, row.name, setupLink).catch((error: unknown) => {
      console.error("[AuthService] Setup-E-Mail konnte nicht versendet werden.", error);
    });
    return { user: toUser(row), setupLink };
  }

  async updateProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
    const user = await this.findById(userId);
    if (!user) throw new Error("Nutzer nicht gefunden.");
    const connection = await db.getConnection();
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.name;
    try {
      await connection.beginTransaction();
      await this.saveProfileRow(connection, userId, profile);
      await connection.execute("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return profile;
  }

  async resendSetup(userId: string): Promise<string> {
    const row = await this.findById(userId);
    if (!row) throw new Error("Nutzer nicht gefunden.");
    if (row.status === "active") throw new Error("Nutzer hat bereits ein Passwort gesetzt.");
    const token = await this.createToken(row.id, "setup", SETUP_TOKEN_TTL_MS);
    const setupLink = `${this.appBaseUrl}/set-password?token=${token}`;
    await this.email.sendAccountSetup(row.email, row.name, setupLink);
    return setupLink;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const row = await this.findByEmail(email);
    if (!row || row.status !== "active") return; // Keine Preisgabe, ob die E-Mail existiert.
    const token = await this.createToken(row.id, "reset", RESET_TOKEN_TTL_MS);
    const link = `${this.appBaseUrl}/set-password?token=${token}`;
    await this.email.sendPasswordReset(row.email, row.name, link);
  }

  async setPassword(token: string, password: string): Promise<User> {
    const [tokenRows] = await db.execute<(RowDataPacket & { token: string; user_id: string; purpose: string; expires_at: string; used_at: string | null })[]>("SELECT * FROM password_tokens WHERE token = ?", [token]);
    const tokenRow = tokenRows[0];
    if (!tokenRow || tokenRow.used_at) throw new Error("Der Link ist ungültig oder wurde bereits verwendet.");
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) throw new Error("Der Link ist abgelaufen.");
    const row = await this.findById(tokenRow.user_id);
    if (!row) throw new Error("Nutzer nicht gefunden.");
    const passwordHash = await bcrypt.hash(password, 12);
    await db.execute("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?", [passwordHash, row.id]);
    await db.execute("UPDATE password_tokens SET used_at = ? WHERE token = ?", [new Date().toISOString(), token]);
    return toUser({ ...row, password_hash: passwordHash, status: "active" });
  }

  async verifyLogin(email: string, password: string): Promise<User> {
    const row = await this.findByEmail(email);
    if (!row || !row.password_hash || row.status !== "active") throw new Error("E-Mail oder Passwort ist falsch.");
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) throw new Error("E-Mail oder Passwort ist falsch.");
    return toUser(row);
  }

  private async createToken(userId: string, purpose: "setup" | "reset", ttlMs: number): Promise<string> {
    await db.execute("DELETE FROM password_tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL", [userId, purpose]);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    await db.execute("INSERT INTO password_tokens (token, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)", [token, userId, purpose, expiresAt]);
    return token;
  }

  private async saveProfileRow(connection: PoolConnection, userId: string, profile: UserProfile): Promise<void> {
    await connection.execute(`
      INSERT INTO user_profiles (user_id, salutation, first_name, last_name, street, house_number, postal_code, city, mobile, sick_hours, vacation_hours, license_plate, electric_car)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        salutation = VALUES(salutation),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        street = VALUES(street),
        house_number = VALUES(house_number),
        postal_code = VALUES(postal_code),
        city = VALUES(city),
        mobile = VALUES(mobile),
        sick_hours = VALUES(sick_hours),
        vacation_hours = VALUES(vacation_hours),
        license_plate = VALUES(license_plate),
        electric_car = VALUES(electric_car)
    `, [userId, profile.salutation, profile.firstName, profile.lastName, profile.street, profile.houseNumber, profile.postalCode, profile.city, profile.mobile, profile.sickHours, profile.vacationHours, profile.licensePlate, profile.electricCar ? 1 : 0]);
  }
}
