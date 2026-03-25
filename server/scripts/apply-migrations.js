/**
 * Aplica migrations SQL pendentes no banco MySQL
 * Usa a ordem alfabética dos arquivos .sql
 */

import { extractConnectionParams } from '../drizzle/schema.js'; // ou usar getDb
import { getDb } from '../db.js';

async function applyMigrations() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const fs = await import('fs');
  const path = await import('path');

  const migrationsDir = path.join(process.cwd(), 'server', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // ordem alfabética: 0000_, 0001_, etc.

  console.log(`[Migrations] Encontradas ${files.length} migrations`);

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    try {
      // Executar cada statement separadamente (arquivos podem ter múltiplos statements)
      const statements = sql.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          await db.execute(stmt + ';');
        }
      }
      console.log(`[Migrations] ✅ Aplicada: ${file}`);
    } catch (err: any) {
      console.error(`[Migrations] ❌ Erro em ${file}:`, err.message);
      // Continuar com a próxima
    }
  }

  console.log('[Migrations] ✅ Concluído');
}

applyMigrations().catch(err => {
  console.error('[Migrations] Fatal:', err);
  process.exit(1);
});
