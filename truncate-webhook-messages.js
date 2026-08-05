import { getDb } from './server/db.js';  // Try .js first
import { processedWebhookMessages } from './server/drizzle/schema.js';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      process.exit(1);
    }
    
    // Count records
    const countResult = await db.execute(
      `SELECT COUNT(*) as count FROM processed_webhook_messages`
    );
    const initialCount = countResult[0].count;
    console.log(`📊 Found ${initialCount} records in processed_webhook_messages`);
    
    if (initialCount > 0) {
      await db.execute(`TRUNCATE TABLE processed_webhook_messages`);
      console.log('🗑️  Truncated processed_webhook_messages table');
    } else {
      console.log('✅ Table already empty');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error truncating table:', error);
    process.exit(1);
  }
}

main();
