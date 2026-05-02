import { sql } from "drizzle-orm";

export async function applySqlMigrations() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { getDb } = await import('../db');
    const db = await getDb();

    if (!db) {
      console.log("[Migrations] DB not ready, skipping");
      return;
    }

    const migrationsDir = path.join(process.cwd(), 'server', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log("[Migrations] Diretório de migrations não encontrado, pulando.");
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`[Migrations] Encontradas ${files.length} migrations`);

    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS _migrations_applied (
          migration_name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (migration_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("[Migrations] ✅ Tabela de controle _migrations_applied verificada/criada");
    } catch (err: unknown) {
      console.error("[Migrations] ❌ Erro ao criar tabela de controle:", err.message);
    }

    let appliedSet = new Set<string>();
    try {
      const [rows] = await db.execute(sql`SELECT migration_name FROM _migrations_applied`);
      (rows as any[]).forEach((row: unknown) => appliedSet.add(row.migration_name));
    } catch (err: unknown) {}

    for (const file of files) {
      if (!file || appliedSet.has(file)) continue;

      console.log(`[Migrations] ▶ Aplicando: ${file}`);
      const fullPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(fullPath, 'utf8');

      try {
        const statements = sqlContent.split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        let failed = false;

        for (const stmt of statements) {
          if (!stmt) continue;
          try {
            await (db as any).execute(stmt + ';');
          } catch (stmtErr: unknown) {
            const errorString = (stmtErr.message + ' ' + (stmtErr.code || '') + ' ' + (stmtErr.stack || '')).toLowerCase();
            
            // BYPASS INTELIGENTE: Ignora erros de itens que já existem
            if (
              errorString.includes('duplicate column') || 
              errorString.includes('already exists') || 
              errorString.includes('duplicate key') ||
              errorString.includes('er_dup_fieldname') || 
              errorString.includes('er_dup_keyname') ||
              errorString.includes('er_table_exists_error')
            ) {
              console.log(`[Migrations] ⏭️ Ignorando (já existe no banco): bypass seguro ativado.`);
            } else {
              console.error(`[Migrations] ❌ Erro real na query:`, stmtErr.message);
              failed = true;
              break; 
            }
          }
        }

        if (!failed) {
          try {
            await db.execute(sql`INSERT IGNORE INTO _migrations_applied (migration_name) VALUES (${file})`);
            console.log(`[Migrations] ✅ Aplicada e registrada: ${file}`);
          } catch (err: unknown) {
            console.warn(`[Migrations] ⚠️ Aplicada mas não foi possível registrar: ${file}`, err.message);
          }
        }

      } catch (err: unknown) {
        console.error(`[Migrations] ❌ Erro em ${file}:`, err.message);
      }
    }

    console.log('[Migrations] ✅ Processamento de migrations concluído');
  } catch (err) {
    console.error('[Migrations] ❌ Falha crítica:', err);
  }
}
