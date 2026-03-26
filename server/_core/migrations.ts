import { sql } from "drizzle-orm";

// Aplica migrations SQL da pasta server/database/migrations
export async function applySqlMigrations() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { getDb } = await import("../db");
    const db = await getDb();

    if (!db) {
      console.log("[Migrations] DB not ready, skipping");
      return;
    }

    const migrationsDir = path.join(process.cwd(), "server", "database", "migrations");

    if (!fs.existsSync(migrationsDir)) {
      console.log("[Migrations] Diretório de migrations não encontrado, pulando.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`[Migrations] Encontradas ${files.length} migrations`);

    // 1️⃣ Garantir que a tabela de controle existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS _migrations_applied (
        migration_name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (migration_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("[Migrations] ✅ Tabela de controle _migrations_applied verificada/criada");

    // 2️⃣ Ler migrations já aplicadas
    let applied = new Set<string>();
    try {
      const [rows] = await db.execute(sql`SELECT migration_name FROM _migrations_applied`);
      applied = new Set(rows.map((r: any) => r.migration_name));
    } catch (err: any) {
      console.warn("[Migrations] ⚠️ Não foi possível ler _migrations_applied:", err.message);
    }

    // 3️⃣ Aplicar migrations pendentes
    for (const file of files) {
      if (!file) continue;

      if (applied.has(file)) {
        continue;
      }

      console.log(`[Migrations] ▶ Aplicando: ${file}`);

      const fullPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(fullPath, "utf8");

      try {
        await db.execute(sql`${sql.raw(sqlContent)}`);
      } catch (err: any) {
        console.error(`[Migrations] ❌ Erro em ${file}:`, err.message);
        continue;
      }

      // Registrar migration aplicada
      try {
        await db.execute(sql`
          INSERT IGNORE INTO _migrations_applied (migration_name)
          VALUES (${file})
        `);
      } catch (err: any) {
        console.warn(`[Migrations] ⚠️ Aplicada mas não foi possível registrar: ${file}`, err.message);
      }
    }

    console.log("[Migrations] Applied");
  } catch (err: any) {
    console.error("[Migrations] ❌ Falha crítica:", err);
  }
}
