import { createPool } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  try {
    const url = new URL(DATABASE_URL);
    const pool = createPool({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port ? parseInt(url.port) : 3306,
    });

    console.log('Clearing processed_webhook_messages table...');
    await pool.query('TRUNCATE TABLE processed_webhook_messages');
    console.log('Table cleared successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
