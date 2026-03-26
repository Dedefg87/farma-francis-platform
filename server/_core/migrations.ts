import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applySqlMigrations() {
  const migrationsDir = path.join(__dirname, "..", "database", "migrations");
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  });

  for (const file of sqlFiles) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    try {
      await connection.execute(sql);
      console.log(`[Migration] Applied: ${file}`);
    } catch (err) {
      console.error(`[Migration] Error in ${file}:`, err.message);
    }
  }
  await connection.end();
}
