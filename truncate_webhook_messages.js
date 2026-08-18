import { getDb } from './server/db.js';

async function truncateTable() {
  let db;
  try {
    db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      process.exit(1);
    }
    
    // Execute truncate
    await db.execute(`TRUNCATE TABLE processed_webhook_messages`);
    console.log('✅ Successfully truncated processed_webhook_messages table');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error truncating table:', error);
    process.exit(1);
  }
}

truncateTable();
