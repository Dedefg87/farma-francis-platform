import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function test() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    return;
  }
  
  const rows = await db.execute(sql`
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
  
  console.log("Rows type:", typeof rows);
  console.log("Rows:", JSON.stringify(rows, null, 2));
}

test().catch(console.error);
