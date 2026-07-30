import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

import mysql from 'mysql2/promise';

async function test() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL");
    return;
  }
  
  const url = new URL(process.env.DATABASE_URL);
  
  const pool = mysql.createPool({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
  
  try {
    const [rows] = await pool.execute(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        conv.channel,
        conv.last_message_at,
        (
          SELECT cm.content 
          FROM conversation_messages cm 
          WHERE cm.conversation_id = conv.id 
          ORDER BY cm.created_at DESC 
          LIMIT 1
        ) as last_message_preview
      FROM conversations conv
      INNER JOIN customers c ON conv.customer_id = c.id
      WHERE conv.status IN ('open', 'assigned', 'closed')
        AND c.phone IS NOT NULL
        AND c.phone != ''
      ORDER BY conv.last_message_at DESC
      LIMIT 5
    `);
    
    console.log("Rows:", JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

test();
