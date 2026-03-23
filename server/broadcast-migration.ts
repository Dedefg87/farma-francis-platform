export async function runBroadcastMigrations() {
  const db = await getDbRaw();
  if (!db) {
    console.error("[Broadcast Migration] Database not available");
    return false;
  }

  try {
    console.log("[Broadcast Migration] 🚀 Starting broadcast migrations...");

    // ==============================
    // broadcast_lists table
    // ==============================
    console.log("[Broadcast Migration] 📋 Creating broadcast_lists...");
    await db.execute(
      `CREATE TABLE IF NOT EXISTS broadcast_lists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        last_sent_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_created_by (created_by),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    console.log("[Broadcast Migration] ✅ broadcast_lists ready");

    // ==============================
    // broadcast_list_members table
    // ==============================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS broadcast_list_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        list_id INT NOT NULL,
        customer_id INT NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_list_customer (list_id, customer_id),
        KEY idx_list_id (list_id),
        KEY idx_customer_id (customer_id),
        CONSTRAINT broadcast_list_members_ibfk_1 FOREIGN KEY (list_id) REFERENCES broadcast_lists (id) ON DELETE CASCADE,
        CONSTRAINT broadcast_list_members_ibfk_2 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // ==============================
    // broadcast_messages table
    // ==============================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS broadcast_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        list_id INT NOT NULL,
        message_text TEXT NOT NULL,
        caption TEXT,
        file_url TEXT,
        file_name VARCHAR(255) DEFAULT NULL,
        file_type VARCHAR(100) DEFAULT NULL,
        file_size INT DEFAULT NULL,
        sender_id INT NOT NULL,
        sender_type ENUM('agent','system') NOT NULL DEFAULT 'agent',
        status ENUM('draft','sending','sent','failed','partial') NOT NULL DEFAULT 'draft',
        sent_at TIMESTAMP NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_list_id (list_id),
        KEY idx_status (status),
        KEY idx_sender_id (sender_id),
        CONSTRAINT broadcast_messages_ibfk_1 FOREIGN KEY (list_id) REFERENCES broadcast_lists (id) ON DELETE CASCADE,
        CONSTRAINT broadcast_messages_ibfk_2 FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // ==============================
    // broadcast_members_sent table
    // ==============================
    await db.execute(
      `CREATE TABLE IF NOT EXISTS broadcast_members_sent (
        id INT AUTO_INCREMENT PRIMARY KEY,
        broadcast_message_id INT NOT NULL,
        customer_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status ENUM('pending','sent','delivered','read','failed') NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        read_at TIMESTAMP NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_message_customer (broadcast_message_id, customer_id),
        KEY idx_broadcast_message_id (broadcast_message_id),
        KEY idx_customer_id (customer_id),
        KEY idx_status (status),
        CONSTRAINT broadcast_members_sent_ibfk_1 FOREIGN KEY (broadcast_message_id) REFERENCES broadcast_messages (id) ON DELETE CASCADE,
        CONSTRAINT broadcast_members_sent_ibfk_2 FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // ==============================
    // Add created_by column to users if not exists
    // ==============================
    const ensureUserColumn = async (columnName: string, ddl: string) => {
      const [r] = await db.execute(
        `SELECT COUNT(*) as count FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`,
        [columnName]
      ) as any[];
      const exists = r && Number(r[0]?.count || 0) > 0;
      if (!exists) {
        console.log(`[Broadcast Migration] Adding users.${columnName}`);
        await db.execute(`ALTER TABLE users ADD COLUMN ${ddl}`);
      }
    };

    await ensureUserColumn(
      "created_by",
      "created_by INT DEFAULT NULL"
    );

    console.log("[Broadcast Migration] 🎉 All tables created successfully!");
    return true;
  } catch (error) {
    console.error("[Broadcast Migration] Error:", error);
    return false;
  }
}
