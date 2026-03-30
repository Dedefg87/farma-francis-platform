import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const migrationRouter = router({
  runBabyShowerMigration: protectedProcedure.mutation(async () => {
    try {
      const db = await getDb();
      
      // Criar tabelas manualmente se não existirem
      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mother_customer_id INT NOT NULL,
          event_code VARCHAR(20) NOT NULL UNIQUE,
          event_name VARCHAR(255) NOT NULL,
          expected_due_date DATE,
          event_date DATE,
          status ENUM('active', 'closed', 'cancelled') DEFAULT 'active' NOT NULL,
          wallet_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
          total_diapers_count INT DEFAULT 0,
          available_diapers_count INT DEFAULT 0,
          target_amount DECIMAL(12, 2),
          total_guests INT DEFAULT 0,
          public_link VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          closed_at TIMESTAMP NULL,
          INDEX idx_mother (mother_customer_id),
          INDEX idx_status (status),
          INDEX idx_code (event_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_gift_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_name VARCHAR(120) NOT NULL,
          description TEXT,
          gift_type ENUM('diapers', 'wipes', 'money', 'product') DEFAULT 'diapers',
          quantity_represented INT DEFAULT 1,
          size_label VARCHAR(20),
          price DECIMAL(10, 2) NOT NULL,
          stock_limit INT,
          sold_count INT DEFAULT 0,
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_event (event_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_id INT NOT NULL,
          guest_customer_id INT,
          guest_name VARCHAR(255) NOT NULL,
          guest_phone VARCHAR(20),
          guest_email VARCHAR(320),
          message_to_parents TEXT,
          payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
          amount_paid DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50),
          payment_reference VARCHAR(255),
          paid_at TIMESTAMP,
          notification_sent INT DEFAULT 0,
          notification_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_event (event_id),
          INDEX idx_status (payment_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_withdrawals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          related_task_id INT,
          withdrawal_type ENUM('diapers', 'wipes', 'money') DEFAULT 'diapers',
          diaper_size VARCHAR(20),
          quantity INT NOT NULL,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          fulfilled_at TIMESTAMP,
          status ENUM('requested', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'requested',
          fulfilled_by INT,
          delivery_method ENUM('pickup', 'delivery') DEFAULT 'pickup',
          notes TEXT,
          INDEX idx_event (event_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Adicionar coluna expected_due_date na tabela customers se não existir
      try {
        await db.execute(`ALTER TABLE customers ADD COLUMN expected_due_date DATE`);
      } catch (e) {
        // Coluna já existe
      }

      return { success: true, message: "Tabelas do Chá de Bebê criadas com sucesso!" };
    } catch (error: any) {
      console.error("Migration error:", error);
      return { success: false, error: error.message };
    }
  }),

  checkTables: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      const tables = await db.execute(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name LIKE 'baby_shower%'
      `);
      
      return { 
        success: true, 
        tables: (tables as any[]).map((t: any) => t.table_name || t.TABLE_NAME)
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }),
});
