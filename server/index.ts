import { getDb } from "./db";
import { sql } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) {
    console.error("[DB] ❌ Database connection failed");
    return;
  }

  // Safety net: ensure received_messages.from_profile_pic column exists (foto do cliente)
  try {
    const [picCols] = await db.execute(sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'received_messages' AND column_name = 'from_profile_pic'`);
    if (!Array.isArray(picCols) || picCols.length === 0) {
      await db.execute(sql`ALTER TABLE received_messages ADD COLUMN from_profile_pic LONGTEXT NULL AFTER from_name`);
      console.log("[DB] ✅ received_messages.from_profile_pic column added");
    }
  } catch (picErr: unknown) {
    console.warn("[DB] ⚠️ Could not add received_messages.from_profile_pic:", (picErr as Error).message);
  }

  // Safety net: ensure users.photo column exists (foto do perfil do usuario)
  try {
    const [photoCols] = await db.execute(sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'photo'`);
    if (!Array.isArray(photoCols) || photoCols.length === 0) {
      await db.execute(sql`ALTER TABLE users ADD COLUMN photo VARCHAR(512) NULL AFTER email`);
      console.log("[DB] ✅ users.photo column added");
    }
  } catch (photoErr: unknown) {
    console.warn("[DB] ⚠️ Could not add users.photo:", (photoErr as Error).message);
  }
})();