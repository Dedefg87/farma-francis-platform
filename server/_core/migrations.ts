// Aplica migrations SQL da pasta server/database/migrations
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
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // ordem alfabética

    console.log(`[Migrations] Encontradas ${files.length} migrations`);

    // 1️⃣ Garantir que a tabela de controle existe
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS _migrations_applied (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_migration_name (migration_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("[Migrations] ✅ Tabela de controle _migrations_applied verificada/criada");
    } catch (err: any) {
      console.error("[Migrations] ❌ Erro ao criar tabela de controle:", err.message);
      // Continuar mesmo com erro na tabela de controle
    }

    // 2️⃣ Buscar migrations já aplicadas
    let appliedSet = new Set<string>();
    try {
      const [rows] = await db.execute("SELECT migration_name FROM _migrations_applied");
      rows.forEach((row: any) => appliedSet.add(row.migration_name));
      console.log(`[Migrations] 📋 ${appliedSet.size} migrations já aplicadas anteriormente`);
    } catch (err: any) {
      console.warn("[Migrations] ⚠️ Não foi possível ler _migrations_applied, assumindo que nenhuma foi aplicada:", err.message);
    }

    // 3️⃣ Processar cada arquivo
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);

      // Pular se já aplicada
      if (appliedSet.has(file)) {
        console.log(`[Migrations] ⏭️ Já aplicada: ${file} (pulando)`);
        continue;
      }

      const sql = fs.readFileSync(fullPath, 'utf8');

      try {
        // Dividir em statements e executar um por um
        const statements = sql.split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          if (stmt) {
            await db.execute(stmt + ';');
          }
        }

        // Se chegou aqui, sucesso → marcar como aplicada
        try {
          await db.execute(
            "INSERT IGNORE INTO _migrations_applied (migration_name) VALUES (?)",
            [file]
          );
          console.log(`[Migrations] ✅ Aplicada e registrada: ${file}`);
        } catch (err: any) {
          console.warn(`[Migrations] ⚠️ Aplicada mas não foi possível registrar: ${file}`, err.message);
        }
      } catch (err: any) {
        console.error(`[Migrations] ❌ Erro em ${file}:`, err.message);
        // Não registrar no _migrations_applied, continuar para próxima
      }
    }

    console.log('[Migrations] ✅ Processamento de migrations concluído');
  } catch (err) {
    console.error('[Migrations] ❌ Falha crítica:', err);
  }
}
