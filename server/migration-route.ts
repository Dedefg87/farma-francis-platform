import { Router } from "express";
import { getDb } from "./db";

const router = Router();

// Endpoint temporário para executar migration
// DELETE THIS FILE AFTER RUNNING
router.post("/run-migration", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Check if columns already exist
    const [existing] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'conversation_messages' 
      AND COLUMN_NAME = 'delivery_status'
    `);

    if (existing && (existing as any[]).length > 0) {
      return res.json({ message: "Migration already applied" });
    }

    // Add columns
    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN delivery_status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending' AFTER content
    `);

    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN external_message_id VARCHAR(255) NULL AFTER delivery_status
    `);

    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN sent_at TIMESTAMP NULL AFTER external_message_id
    `);

    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN delivered_at TIMESTAMP NULL AFTER sent_at
    `);

    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN read_at TIMESTAMP NULL AFTER delivered_at
    `);

    await db.execute(`
      ALTER TABLE conversation_messages
      ADD COLUMN error_message TEXT NULL AFTER read_at
    `);

    res.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
