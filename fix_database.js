const mysql = require('mysql2/promise');

async function truncateTable() {
  let connection;
  try {
    // Try to get DATABASE_URL directly (common in Railway)
    let dbUrl = process.env.DATABASE_URL;
    
    // If not available, try to construct from individual vars (Railway MySQL plugin format)
    if (!dbUrl) {
      const host = process.env.RAILWAY_MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST;
      const port = process.env.RAILWAY_MYSQL_PORT || process.env.MYSQLPORT || process.env.DB_PORT || 3306;
      const user = process.env.RAILWAY_MYSQL_USERNAME || process.env.MYSQLUSERNAME || process.env.DB_USER;
      const password = process.env.RAILWAY_MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
      const database = process.env.RAILWAY_MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME;
      
      if (host && port && user && password && database) {
        dbUrl = `mysql://${user}:${password}@${host}:${port}/${database}`;
      }
    }
    
    if (!dbUrl) {
      console.error('❌ Could not determine database connection details');
      console.error('Available env vars starting with MYSQL, DATABASE, or DB:');
      Object.keys(process.env)
        .filter(k => k.match(/^(MYSQL|DATABASE|DB)/i))
        .forEach(k => console.error(`  ${k}=${process.env[k].length > 8 ? process.env[k].substring(0,8)+'...' : process.env[k]}`));
      process.exit(1);
    }
    
    console.log('🔌 Connecting to database...');
    // Create connection pool
    const pool = mysql.createPool(dbUrl);
    
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
    
    // Clean up
    connection.release();
    await pool.end();
    
    console.log('🎉 Operation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
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
