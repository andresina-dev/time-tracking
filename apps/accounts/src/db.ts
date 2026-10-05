import { db } from "../../backend/src/db.js";

export { db };

export async function initializeAccountsDatabase(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      role VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL,
      password_hash VARCHAR(255),
      created_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_tokens (
      token CHAR(64) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      purpose VARCHAR(16) NOT NULL,
      expires_at VARCHAR(40) NOT NULL,
      used_at VARCHAR(40),
      CONSTRAINT fk_password_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id VARCHAR(36) PRIMARY KEY,
      salutation VARCHAR(32) NOT NULL DEFAULT '',
      first_name VARCHAR(255) NOT NULL DEFAULT '',
      last_name VARCHAR(255) NOT NULL DEFAULT '',
      street VARCHAR(255) NOT NULL DEFAULT '',
      house_number VARCHAR(32) NOT NULL DEFAULT '',
      postal_code VARCHAR(32) NOT NULL DEFAULT '',
      city VARCHAR(255) NOT NULL DEFAULT '',
      mobile VARCHAR(64) NOT NULL DEFAULT '',
      sick_hours DOUBLE NOT NULL DEFAULT 0,
      vacation_hours DOUBLE NOT NULL DEFAULT 0,
      license_plate VARCHAR(32) NOT NULL DEFAULT '',
      electric_car TINYINT NOT NULL DEFAULT 0,
      CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute("INSERT IGNORE INTO user_profiles (user_id) SELECT id FROM users");
}
