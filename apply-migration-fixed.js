#!/usr/bin/env node

/**
 * Aplica a migração corrigida do broadcast_messages
 * Usa MYSQL_PUBLIC_URL para conexão externa
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function runMigration() {
  const url = process.env.MYSQL_PUBLIC_URL || 'mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway';

  console.log('🔌 Conectando ao MySQL...');
  const connection = await mysql.createConnection(url);

  console.log('📖 Lendo migração corrigida...');
  const sqlPath = join(process.cwd(), 'server/database/migrations/20250324_migrate_broadcast_messages_definitive_FIXED.sql');
  const sql = await readFile(sqlPath, 'utf-8');

  console.log('🚀 Executando migração (modo tolerante)...');

  // Dividir por blocos (entre BEGIN e COMMIT ou por ;)
  const rawStatements = sql.split(';').filter(s => s.trim().length > 0);

  // Agrupar em transações manualmente
  for (const rawStmt of rawStatements) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;

    try {
      await connection.query(stmt);
      console.log('✅ Executado:', stmt.substring(0, 60) + '...');
    } catch (err) {
      // Se for erro de "duplicate column", ignorar e continuar
      if (err.code === 'ER_CANT_ADD_FIELD' || err.errno === 1060 || err.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️  Coluna já existe ou campo incorreto, ignorando:', stmt.substring(0, 60) + '...');
      } else {
        console.error('❌ Erro inesperado:', err.message);
        throw err;
      }
    }
  }

  // Verificação final
  console.log('\n🔎 Verificando estrutura final...');
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
    ORDER BY ORDINAL_POSITION
  `);
  console.table(columns);

  await connection.end();
  console.log('\n🎉 Migração concluída (com avisos controlados).');
}

runMigration().catch(err => {
  console.error('\n💥 Falha na migração:', err);
  process.exit(1);
});
