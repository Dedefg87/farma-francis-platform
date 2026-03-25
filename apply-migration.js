#!/usr/bin/env node

/**
 * Script para aplicar a migração broadcast definitive no MySQL do Railway
 * Usa a MYSQL_PUBLIC_URL para conexão externa
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function runMigration() {
  const url = process.env.MYSQL_PUBLIC_URL || 'mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway';

  console.log('🔌 Conectando ao MySQL...');
  const connection = await mysql.createConnection(url);

  console.log('📖 Lendo arquivo de migração...');
  const sqlPath = join(process.cwd(), 'server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql');
  const sql = await readFile(sqlPath, 'utf-8');

  console.log('🚀 Executando migração...');
  console.log('SQL length:', sql.length, 'chars');

  // Dividir em statements separados por ; (o arquivo já tem GO entre blocos, mas vamos tratar)
  const statements = sql.split(';').filter(s => s.trim().length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    try {
      await connection.query(stmt);
      console.log(`✅ Statement ${i + 1}/${statements.length} executado`);
    } catch (err) {
      console.error(`❌ Erro no statement ${i + 1}:`, err.message);
      // Continuar mesmo com erro? Melhor parar
      throw err;
    }
  }

  await connection.end();
  console.log('🎉 Migração concluída com sucesso!');
}

runMigration().catch(err => {
  console.error('💥 Falha na migração:', err);
  process.exit(1);
});
