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
    // baby_shower_packages table
    // ==============================
    const packagesTableExists = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_packages'
    `);
    
    const packagesExists = Array.isArray(packagesTableExists) && 
      packagesTableExists.length > 0 && 
      Number((packagesTableExists[0] as any)?.count || 0) > 0;
    
    if (!packagesExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_packages table");
      await db.raw(`
        CREATE TABLE baby_shower_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          price DECIMAL(10,2) NOT NULL,
          stock_limit INT NULL,
          sold_count INT DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
          guest_name VARCHAR(255) NOT NULL,
          guest_phone VARCHAR(50) NULL,
          guest_email VARCHAR(255) NULL,
          quantity INT NOT NULL DEFAULT 1,
          amount DECIMAL(10,2) NOT NULL,
          status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
          payment_method VARCHAR(50) NULL,
          payment_reference VARCHAR(255) NULL,
          notes TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          paid_at TIMESTAMP NULL,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
          FOREIGN KEY (package_id) REFERENCES baby_shower_packages(id) ON DELETE SET NULL
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
