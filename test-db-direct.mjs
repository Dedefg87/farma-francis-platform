import { createClient } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = process.env.DATABASE_URL;
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)/);
  const [, username, password, host, port, database] = match;
  
  const conn = await createClient({
    host, port: port ? parseInt(port) : 3306, user: username, password, database
  });
  
  console.log('✅ Conectado ao MySQL');
  
  // Verificar customers com telefones
  const [rows] = await conn.execute(`
    SELECT id, name, phone FROM customers 
    WHERE phone IS NOT NULL 
    ORDER BY id LIMIT 10
  `);
  console.log('📋 Amostra de customers (max 10):');
  console.table(rows);
  
  // Contar total
  const [countRow] = await conn.execute('SELECT COUNT(*) as total FROM customers');
  console.log(`📊 Total de customers: ${countRow[0].total}`);
  
  // Verificar se há telefones com + ou diferentes formatos
  const [variationRows] = await conn.execute(`
    SELECT id, name, phone,
      REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', '') as digits
    FROM customers
    WHERE phone IS NOT NULL
    ORDER BY digits LIMIT 10
  `);
  console.log('📋 Com formatação normalizada:');
  variationRows.forEach((r: any) => {
    console.log(`   ID ${r.id}: ${r.phone} -> ${r.digits} (len=${r.digits.length})`);
  });
  
  await conn.end();
}
test().catch(e => console.error('❌ Erro:', e.message));
