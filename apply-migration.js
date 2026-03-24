#!/usr/bin/env node

/**
 * Script para aplicar a migration de broadcast_messages no banco da Railway
 * Uso: node apply-migration.js
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  // Obter DATABASE_URL do ambiente (Railway fornece)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
    console.log('💡 No Railway, a DATABASE_URL está disponível automaticamente');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de dados...');

  let connection;
  try {
    connection = await mysql.createConnection(databaseUrl);

    console.log('✅ Conexão estabelecida');

    // Ler o script SQL
    const sqlPath = join(__dirname, 'server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql');
    const sql = await readFile(sqlPath, 'utf8');

    console.log('📄 Lendo migration SQL...');

    // Executar script
    console.log('⚡ Aplicando migration...');
    await connection.query(sql);

    console.log('✅ Migration aplicada com sucesso!');

    // Verificar estrutura
    console.log('\n🔍 Verificando estrutura da tabela broadcast_messages:');
    const [rows] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(rows);

    // Verificar se as colunas esperadas existem
    const expectedColumns = ['message_text', 'caption', 'sender_id', 'sender_type', 'error_message'];
    const actualColumns = rows.map(r => r.COLUMN_NAME);

    console.log('\n✅ Verificação de colunas:');
    expectedColumns.forEach(col => {
      const exists = actualColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error.message);
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('\n💡 Dica: As colunas já podem ter sido renomeadas. Execute DESCRIBE broadcast_messages para verificar.');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

await applyMigration();
