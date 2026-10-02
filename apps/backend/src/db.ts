import "dotenv/config";
import { createPool } from "mysql2/promise";

export function createMysqlPool(database: string) {
  return createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "time_tracking",
    password: process.env.DB_PASSWORD,
    database,
    charset: "utf8mb4",
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });
}

export const db = createMysqlPool(process.env.DB_NAME ?? "time_tracking");

export async function initializeTimeTrackingDatabase(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id VARCHAR(191) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      date CHAR(10) NOT NULL,
      tour VARCHAR(32) NOT NULL,
      started_at VARCHAR(40),
      ended_at VARCHAR(40),
      status VARCHAR(32) NOT NULL,
      day_status VARCHAR(2) NOT NULL DEFAULT '',
      remark VARCHAR(500) NOT NULL DEFAULT '',
      tour_number INT NOT NULL,
      decimal_hours DOUBLE NOT NULL,
      duration_minutes INT NOT NULL,
      UNIQUE KEY unique_user_date_tour (user_id, date, tour)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}
