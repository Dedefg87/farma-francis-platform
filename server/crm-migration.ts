import { getDb } from "./db";
import { eq } from "drizzle-orm";

export async function runCRMMigration() {
  const db = await getDb();
  if (!db) {
    console.error("[CRM Migration] Database not available");
    return false;
  }

  try {
    console.log("[CRM Migration] Starting...");

    // Criar tabelas se não existirem (MySQL)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_treatments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        nome_medicamento VARCHAR(255) NOT NULL,
        posologia_diaria INT NOT NULL COMMENT 'Qtd comprimidos/dia',
        qtd_caixa INT NOT NULL COMMENT 'Qtd total na caixa',
        data_ultima_compra DATETIME,
        data_fim_previsto DATETIME COMMENT 'Campo calculado para query performática',
        observacoes TEXT,
        is_active INT DEFAULT 1 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#6366f1' NOT NULL COMMENT 'Cor em hex',
        description TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        tag_id INT NOT NULL,
        added_by INT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Inserir tags iniciais
    await db.execute(`
      INSERT IGNORE INTO tags (name, color, description) VALUES 
      ('Diabético', '#ef4444', 'Paciente com diabetes'),
      ('Hipertenso', '#f97316', 'Paciente com hipertensão arterial'),
      ('Dermo', '#8b5cf6', 'Produtos dermatológicos'),
      ('Infantil', '#22c55e', 'Produtos infantil'),
      ('Idoso', '#64748b', 'Paciente idoso'),
      ('VIP', '#eab308', 'Cliente VIP'),
      ('Gestante', '#ec4899', 'Cliente gestante'),
      ('Oncológico', '#06b6d4', 'Tratamento oncológico')
    `);

    console.log("[CRM Migration] Tables created and tags seeded successfully");
    return true;
  } catch (error) {
    console.error("[CRM Migration] Error:", error);
    return false;
  }
}
