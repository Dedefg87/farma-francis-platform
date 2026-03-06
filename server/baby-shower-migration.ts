import { getDbRaw } from "./db";

export async function runBabyShowerMigration() {
  const db = await getDbRaw();
  if (!db || !db.raw) {
    console.error("[Baby Shower Migration] Database not available");
    return false;
  }

  try {
    console.log("[Baby Shower Migration] Starting...");

    // ==============================
    // baby_shower_events table
    // ==============================
    const eventsTableExists = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_events'
    `);
    
    const eventsExists = Array.isArray(eventsTableExists) && 
      eventsTableExists.length > 0 && 
      Number((eventsTableExists[0] as any)?.count || 0) > 0;
    
    if (!eventsExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_events table");
      await db.raw(`
        CREATE TABLE baby_shower_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mother_customer_id INT NULL,
          event_code VARCHAR(50) NOT NULL UNIQUE,
          event_name VARCHAR(255) NOT NULL,
          expected_due_date DATE NULL,
          event_date DATE NULL,
          status ENUM('active', 'closed', 'cancelled') NOT NULL DEFAULT 'active',
          wallet_balance DECIMAL(10,2) DEFAULT 0.00,
          total_diapers_count INT DEFAULT 0,
          available_diapers_count INT DEFAULT 0,
          target_amount DECIMAL(10,2) NULL,
          total_guests INT DEFAULT 0,
          public_link VARCHAR(500) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          closed_at TIMESTAMP NULL,
          FOREIGN KEY (mother_customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )
      `);
    }

    // ==============================
    // baby_shower_gift_packages table (NOME CORRIGIDO!)
    // ==============================
    const packagesTableExists = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_gift_packages'
    `);
    
    const packagesExists = Array.isArray(packagesTableExists) && 
      packagesTableExists.length > 0 && 
      Number((packagesTableExists[0] as any)?.count || 0) > 0;
    
    if (!packagesExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_gift_packages table");
      await db.raw(`
        CREATE TABLE baby_shower_gift_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_name VARCHAR(120) NOT NULL,
          description TEXT NULL,
          gift_type ENUM('diapers', 'wipes', 'money', 'product') NOT NULL DEFAULT 'diapers',
          quantity_represented INT DEFAULT 1,
          size_label VARCHAR(20) NULL,
          price DECIMAL(10,2) NOT NULL,
          stock_limit INT NULL,
          sold_count INT DEFAULT 0,
          is_active INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE
        )
      `);
    }

    // ==============================
    // baby_shower_purchases table
    // ==============================
    const purchasesTableExists = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_purchases'
    `);
    
    const purchasesExists = Array.isArray(purchasesTableExists) && 
      purchasesTableExists.length > 0 && 
      Number((purchasesTableExists[0] as any)?.count || 0) > 0;
    
    if (!purchasesExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_purchases table");
      await db.raw(`
        CREATE TABLE baby_shower_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_id INT NULL,
          guest_customer_id INT NULL,
          guest_name VARCHAR(255) NOT NULL,
          guest_phone VARCHAR(20) NULL,
          guest_email VARCHAR(320) NULL,
          message_to_parents TEXT NULL,
          payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
          amount_paid DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) NULL,
          payment_reference VARCHAR(255) NULL,
          paid_at TIMESTAMP NULL,
          notification_sent INT DEFAULT 0,
          notification_sent_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
          FOREIGN KEY (package_id) REFERENCES baby_shower_gift_packages(id) ON DELETE SET NULL,
          FOREIGN KEY (guest_customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )
      `);
    }

    // ==============================
    // baby_shower_withdrawals table
    // ==============================
    const withdrawalsTableExists = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_withdrawals'
    `);
    
    const withdrawalsExists = Array.isArray(withdrawalsTableExists) && 
      withdrawalsTableExists.length > 0 && 
      Number((withdrawalsTableExists[0] as any)?.count || 0) > 0;
    
    if (!withdrawalsExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_withdrawals table");
      await db.raw(`
        CREATE TABLE baby_shower_withdrawals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          related_task_id INT NULL,
          withdrawal_type ENUM('diapers', 'wipes', 'money') NOT NULL,
          diaper_size VARCHAR(20) NULL,
          quantity INT NOT NULL,
          delivery_method ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup',
          delivery_address TEXT NULL,
          delivery_status ENUM('pending', 'shipped', 'delivered') DEFAULT 'pending',
          notes TEXT NULL,
          created_by_user_id INT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
          FOREIGN KEY (related_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL
        )
      `);
    }

    console.log("[Baby Shower Migration] Completed successfully!");
    return true;
  } catch (error) {
    console.error("[Baby Shower Migration] Error:", error);
    return false;
  }
}
