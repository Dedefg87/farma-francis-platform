import { drizzle } from 'drizzle-orm/node-mysql';
import { mysql } from 'drizzle-orm/mysql-core';
import mysql2 from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  const pool = mysql2.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'farma_francis',
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  const db = drizzle(pool);

  try {
    const total = await db.select().from((db) => db.conversations).limit(1);
    console.log('Sample conversations:', JSON.stringify(total, null, 2));

    const countAll = await db.select({ count: sql<number>`count(*)` }).from((db) => db.conversations);
    console.log('Total conversations in table:', countAll[0]?.count);

    const byChannel = await db.execute(sql`
      SELECT channel, COUNT(*) as count FROM conversations GROUP BY channel
    `);
    console.log('By channel (raw):', byChannel[0]);

    const byStatus = await db.execute(sql`
      SELECT status, COUNT(*) as count FROM conversations GROUP BY status
    `);
    console.log('By status (raw):', byStatus[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

test();
