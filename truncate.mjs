import mysql from 'mysql2/promise';
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }
const pool = mysql.createPool(dbUrl);
let connection;
try {
  connection = await pool.getConnection();
  await connection.query('TRUNCATE TABLE processed_webhook_messages');
  console.log('SUCCESS: Truncated processed_webhook_messages');
} catch (err) { console.error('ERROR:', err); process.exit(1); }
finally { if (connection) connection.release(); await pool.end(); }
