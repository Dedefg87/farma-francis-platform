import { getDb } from "../server/db";
import { processedWebhookMessages } from "../server/drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database not available');
      process.exit(1);
    }

    console.log('Clearing processed_webhook_messages table...');
    await db.execute(sql`TRUNCATE TABLE processed_webhook_messages`);
    console.log('Table cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
