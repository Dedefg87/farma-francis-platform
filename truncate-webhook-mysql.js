import { createPool } from 'mysql2/promise';
import { ENV } from './server/_core/env.js';

async function truncateTable() {
  try {
    const pool = createPool({
      host: ENV.DATABASE_HOST,
      port: parseInt(ENV.DATABASE_PORT) || 3306,
      user: ENV.DATABASE_USERNAME,
      password: ENV.DATABASE_PASSWORD,
      database: ENV.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    try {
      await connection.query('TRUNCATE TABLE processed_webhook_messages');
      console.log('✅ Successfully truncated processed_webhook_messages table');
    } finally {
      connection.release();
    }
    await pool.end();
  } catch (error) {
    console.error('❌ Error truncating table:', error);
    process.exit(1);
  }
}

truncateTable();