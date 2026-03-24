#!/usr/bin/env node
/**
 * Aplica migration broadcast_messages no banco Railway
 * Uso: DATABASE_URL=<sua_url> node apply-migration.cjs
 */

import { drizzle } from 'drizzle-orm/mysql-2';
import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não encontrada');
    console.log('💡 No Railway: DATABASE_URL está automática');
    process.exit(1);
  }

  console.log('🔗 Conectando...');
  const conn = await mysql.createConnection(databaseUrl);

  // Ler SQL migration
  const sqlPath = join(__dirname, 'server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql');
  const sql = await readFile(sqlPath, 'utf8');

  console.log('⚡ Aplicando migration...');
  await conn.query(sql);

  console.log('✅ Migration aplicada com sucesso!');

  // Verificar estrutura
  const [rows] = await conn.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
    ORDER BY ORDINAL_POSITION
  `);

  console.table(rows);
  await conn.end();
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
