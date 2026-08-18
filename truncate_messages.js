const mysql = require('mysql2/promise');
require('dotenv').config();

async function truncateTable() {
  let connection;
  try {
    // Get database connection details from environment
    const dbHost = process.env.DATABASE_HOST || process.env.MYSQLHOST || 'localhost';
    const dbPort = parseInt(process.env.DATABASE_PORT || process.env.MYSQLPORT || '3306');
    const dbUser = process.env.DATABASE_USERNAME || process.env.MYSQLUSER || 'root';
    const dbPassword = process.env.DATABASE_PASSWORD || process.env.MYSQLPASSWORD || '';
    const dbName = process.env.DATABASE_NAME || process.env.MYSQLDATABASE || 'test';
    
    console.log(`🔌 Connecting to database at ${dbHost}:${dbPort}/${dbName} as ${dbUser}`);
    
    // Create connection pool
    const pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
    
    // Get connection
    connection = await pool.getConnection();
    console.log('✅ Database connection established');
    
    // Check current count
    const [countRows] = await connection.query(
      'SELECT COUNT(*) as count FROM processed_webhook_messages'
    );
    const count = countRows[0].count;
    console.log(`📊 Found ${count} records in processed_webhook_messages`);
    
    if (count > 0) {
      // Truncate the table
      await connection.query('TRUNCATE TABLE processed_webhook_messages');
      console.log('🗑️  Successfully truncated processed_webhook_messages table');
    } else {
      console.log('✅ Table is already empty');
    }
    
    // Release connection
    connection.release();
    await pool.end();
    
    console.log('🎉 Operation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (connection) {
      try {
        connection.release();
      } catch (e) {
        // Ignore
      }
    }
    process.exit(1);
  }
}

truncateTable();
