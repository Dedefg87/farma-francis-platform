#!/usr/bin/env node

/**
 * Verifica estrutura atual das tabelas broadcast_* no MySQL
 */

import mysql from 'mysql2/promise';
import { inspect } from 'util';

const url = process.env.MYSQL_PUBLIC_URL || 'mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway';

async function checkTables() {
  const connection = await mysql.createConnection(url);

  console.log('🔍 Verificando tabelas broadcast_*...\n');

  // Listar tabelas
  const [rows] = await connection.query("SHOW TABLES LIKE 'broadcast%'");
  console.log('📋 Tabelas broadcast encontradas:', rows.length);
  console.log(inspect(rows, { depth: null }));

  for (const row of rows) {
    const tableName = Object.values(row)[0];
    console.log(`\n📊 Estrutura da tabela \`${tableName}\`:`);
    const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
    console.table(columns);

    // Verificar indexes
    const [indexes] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
    console.log('  Indexes:', indexes.length);
    indexes.forEach(idx => {
      console.log(`    - ${idx.Key_name}: ${idx.Column_name} (${idx.Non_unique ? 'NOT UNIQUE' : 'UNIQUE'})`);
    });
  }

  await connection.end();
}

checkTables().catch(err => {
  console.error('💥 Erro:', err);
  process.exit(1);
});
