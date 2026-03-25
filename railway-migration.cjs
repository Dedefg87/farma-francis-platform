#!/usr/bin/env node
/**
 * Railway Deploy Hook: Aplica migration automaticamente após deploy
 * Este script é executado pelo Railway durante o deploy (se configurado)
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[Migration] DATABASE_URL não encontrada no ambiente');
    process.exit(1);
  }

  console.log('[Migration] Conectando ao banco...');
  const conn = await mysql.createConnection(dbUrl);

  try {
    const sqlPath = join(__dirname, 'server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql');
    const sql = await readFile(sqlPath, 'utf8');

    console.log('[Migration] Aplicando alterações...');
    await conn.query(sql);

    console.log('[Migration] ✅ Tabela broadcast_messages atualizada com sucesso!');

    // Log da estrutura
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
    `);
    console.log('[Migration] Estrutura atual:', cols);
  } catch (err) {
    console.error('[Migration] ❌ Erro:', err.message);
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[Migration] Algumas colunas já existem. Verifique se a migration já foi aplicada.');
    }
    throw err;
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('[Migration] Falha crítica:', err);
  process.exit(1);
});
