import { getDbRaw } from "./db";
import { sql } from "drizzle-orm";

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
    const eventsTableExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_events'
    `);
    
    const eventsExists = Array.isArray(eventsTableExists) && 
      eventsTableExists.length > 0 && 
      Number((eventsTableExists[0] as any)?.count || 0) > 0;
    
    if (!eventsExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_events table");
      await db.execute(sql`
        CREATE TABLE baby_shower_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mother_customer_id INT NULL,
          event_code VARCHAR(50) NOT NULL UNIQUE,
          event_name VARCHAR(255) NOT NULL,
          expected_due_date DATE NULL,
          event_date DATE NULL,
          status ENUM('active', 'closed', 'cancelled') NOT NULL DEFAULT 'active',
          whatsapp_number VARCHAR(20) NULL,
          wallet_balance DECIMAL(10,2) DEFAULT 0.00,
          total_diapers_count INT DEFAULT 0,
          available_diapers_count INT DEFAULT 0,
          target_amount DECIMAL(12,2) NULL,
          total_guests INT DEFAULT 0,
          public_link VARCHAR(500) NULL,
          welcome_message TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          closed_at TIMESTAMP NULL,
          FOREIGN KEY (mother_customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )
      `);
    } else {
      // Tabela já existe - verificar e adicionar colunas faltantes
      console.log("[Baby Shower Migration] Checking baby_shower_events columns...");
      
      const columns = await db.execute(sql`
        SELECT COLUMN_NAME FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'baby_shower_events'
      `);
      
      const columnNames = Array.isArray(columns) 
        ? columns.map((c: any) => c.COLUMN_NAME) 
        : [];

      // Adicionar colunas que faltam
      if (!columnNames.includes('whatsapp_number')) {
        console.log("[Baby Shower Migration] Adding whatsapp_number column");
        await db.execute(sql`ALTER TABLE baby_shower_events ADD COLUMN whatsapp_number VARCHAR(20) NULL`);
      }
      
      if (!columnNames.includes('welcome_message')) {
        console.log("[Baby Shower Migration] Adding welcome_message column");
        await db.execute(sql`ALTER TABLE baby_shower_events ADD COLUMN welcome_message TEXT NULL`);
      }
      
      if (!columnNames.includes('baby_name')) {
        console.log("[Baby Shower Migration] Adding baby_name column");
        await db.execute(sql`ALTER TABLE baby_shower_events ADD COLUMN baby_name VARCHAR(255) NULL`);
      }
    }

    // ==============================
    // baby_shower_gift_packages table
    // ==============================
    const oldPackagesTableExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_packages'
    `);
    
    const newPackagesTableExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_gift_packages'
    `);
    
    const oldExists = Array.isArray(oldPackagesTableExists) && 
      oldPackagesTableExists.length > 0 && 
      Number((oldPackagesTableExists[0] as any)?.count || 0) > 0;

    const newExists = Array.isArray(newPackagesTableExists) && 
      newPackagesTableExists.length > 0 && 
      Number((newPackagesTableExists[0] as any)?.count || 0) > 0;

    if (oldExists && !newExists) {
      console.log("[Baby Shower Migration] Renaming baby_shower_packages to baby_shower_gift_packages");
      await db.execute(sql`RENAME TABLE baby_shower_packages TO baby_shower_gift_packages`);
    }

    if (!newExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_gift_packages table");
      await db.execute(sql`
        CREATE TABLE baby_shower_gift_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_name VARCHAR(120) NOT NULL,
          description TEXT NULL,
          image_url TEXT NULL,
          gift_type ENUM('diapers', 'wipes', 'money', 'product') NOT NULL DEFAULT 'diapers',
          quantity_represented INT DEFAULT 1,
          size_label VARCHAR(20) NULL,
          price DECIMAL(10,2) NOT NULL,
          stock_limit INT NULL,
          sold_count INT DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE
        )
      `);
    } else {
      // Tabela existe - verificar e adicionar colunas faltantes
      console.log("[Baby Shower Migration] Checking baby_shower_gift_packages columns...");
      
      const giftPkgColumns = await db.execute(sql`
        SELECT COLUMN_NAME FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'baby_shower_gift_packages'
      `);
      
      const giftPkgColumnNames = Array.isArray(giftPkgColumns) 
        ? giftPkgColumns.map((c: any) => c.COLUMN_NAME) 
        : [];

      // Renomear coluna 'name' para 'package_name' se existir
      if (giftPkgColumnNames.includes('name') && !giftPkgColumnNames.includes('package_name')) {
        console.log("[Baby Shower Migration] Renaming 'name' column to 'package_name'");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages CHANGE COLUMN name package_name VARCHAR(255) NOT NULL`);
      }

      // Adicionar colunas que faltam
      if (!giftPkgColumnNames.includes('image_url')) {
        console.log("[Baby Shower Migration] Adding image_url column");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages ADD COLUMN image_url TEXT NULL`);
      }
      
      if (!giftPkgColumnNames.includes('gift_type')) {
        console.log("[Baby Shower Migration] Adding gift_type column");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages ADD COLUMN gift_type ENUM('diapers', 'wipes', 'money', 'product') NOT NULL DEFAULT 'diapers'`);
      }
      
      if (!giftPkgColumnNames.includes('quantity_represented')) {
        console.log("[Baby Shower Migration] Adding quantity_represented column");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages ADD COLUMN quantity_represented INT DEFAULT 1`);
      }
      
      if (!giftPkgColumnNames.includes('size_label')) {
        console.log("[Baby Shower Migration] Adding size_label column");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages ADD COLUMN size_label VARCHAR(20) NULL`);
      }
      
      if (!giftPkgColumnNames.includes('is_active')) {
        console.log("[Baby Shower Migration] Adding is_active column");
        await db.execute(sql`ALTER TABLE baby_shower_gift_packages ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true`);
      }
    }

    // ==============================
    // baby_shower_purchases table
    // ==============================
    const purchasesTableExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_purchases'
    `);
    
    const purchasesExists = Array.isArray(purchasesTableExists) && 
      purchasesTableExists.length > 0 && 
      Number((purchasesTableExists[0] as any)?.count || 0) > 0;
    
    if (!purchasesExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_purchases table");
      await db.execute(sql`
        CREATE TABLE baby_shower_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_id INT NOT NULL,
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
          FOREIGN KEY (package_id) REFERENCES baby_shower_gift_packages(id),
          FOREIGN KEY (guest_customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )
      `);
    } else {
      // Tabela existe - verificar e adicionar colunas faltantes
      console.log("[Baby Shower Migration] Checking baby_shower_purchases columns...");
      
      const columns = await db.execute(sql`
        SELECT COLUMN_NAME FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'baby_shower_purchases'
      `);
      
      const columnNames = Array.isArray(columns) 
        ? columns.map((c: any) => c.COLUMN_NAME) 
        : [];

      // Renomear colunas para corresponder ao schema
      if (columnNames.includes('status') && !columnNames.includes('payment_status')) {
        console.log("[Baby Shower Migration] Renaming 'status' column to 'payment_status'");
        await db.execute(sql`ALTER TABLE baby_shower_purchases CHANGE COLUMN status payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending'`);
      }
      
      if (columnNames.includes('amount') && !columnNames.includes('amount_paid')) {
        console.log("[Baby Shower Migration] Renaming 'amount' column to 'amount_paid'");
        await db.execute(sql`ALTER TABLE baby_shower_purchases CHANGE COLUMN amount amount_paid DECIMAL(10,2) NOT NULL`);
      }

      // Adicionar colunas que faltam
      if (!columnNames.includes('guest_customer_id')) {
        console.log("[Baby Shower Migration] Adding guest_customer_id column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN guest_customer_id INT NULL`);
      }
      
      if (!columnNames.includes('message_to_parents')) {
        console.log("[Baby Shower Migration] Adding message_to_parents column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN message_to_parents TEXT NULL`);
      }
      
      if (!columnNames.includes('notification_sent')) {
        console.log("[Baby Shower Migration] Adding notification_sent column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN notification_sent INT DEFAULT 0`);
      }
      
      if (!columnNames.includes('message_to_parents')) {
        console.log("[Baby Shower Migration] Adding message_to_parents column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN message_to_parents TEXT NULL`);
      }
      if (!columnNames.includes('confirmation_token')) {
        console.log("[Baby Shower Migration] Adding confirmation_token column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN confirmation_token VARCHAR(64) UNIQUE NULL`);
      }
      if (!columnNames.includes('created_at')) {
        console.log("[Baby Shower Migration] Adding created_at column");
        await db.execute(sql`ALTER TABLE baby_shower_purchases ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
      }
    }

    // ==============================
    // baby_shower_withdrawals table
    // ==============================
    const withdrawalsTableExists = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'baby_shower_withdrawals'
    `);
    
    const withdrawalsExists = Array.isArray(withdrawalsTableExists) && 
      withdrawalsTableExists.length > 0 && 
      Number((withdrawalsTableExists[0] as any)?.count || 0) > 0;
    
    if (!withdrawalsExists) {
      console.log("[Baby Shower Migration] Creating baby_shower_withdrawals table");
      await db.execute(sql`
        CREATE TABLE baby_shower_withdrawals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          related_task_id INT NULL,
          withdrawal_type ENUM('diapers', 'wipes', 'money') NOT NULL DEFAULT 'diapers',
          diaper_size VARCHAR(20) NULL,
          quantity INT NOT NULL,
          requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fulfilled_at TIMESTAMP NULL,
          status ENUM('requested', 'preparing', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'requested',
          fulfilled_by INT NULL,
          delivery_method ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup',
          notes TEXT NULL,
          FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
          FOREIGN KEY (related_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL,
          FOREIGN KEY (fulfilled_by) REFERENCES users(id) ON DELETE SET NULL
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
