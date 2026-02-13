import { getDbRaw } from "./db";

export async function runCRMMigration() {
  const db = await getDbRaw();
  if (!db || !db.raw) {
    console.error("[CRM Migration] Database not available");
    return false;
  }

  try {
    console.log("[CRM Migration] Starting...");

    // Verificar se a tabela tags existe
    const tableExistsResult = await db.raw(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'tags'
    `);

    const tableExists =
      Array.isArray(tableExistsResult) &&
      tableExistsResult.length > 0 &&
      Number((tableExistsResult[0] as any)?.count || 0) > 0;

    console.log("[CRM Migration] Tags table exists:", tableExists);

    // Se não existir, criar tabela com a coluna description
    if (!tableExists) {
      console.log(
        "[CRM Migration] Creating tags table with description column"
      );
      await db.raw(`
        CREATE TABLE tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          color VARCHAR(7) DEFAULT '#6366f1' NOT NULL,
          description TEXT,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
    } else {
      // Se tabela existe, verificar se tem a coluna description
      const columnExistsResult = await db.raw(`
        SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'tags' AND column_name = 'description'
      `);

      const columnExists =
        Array.isArray(columnExistsResult) &&
        columnExistsResult.length > 0 &&
        Number((columnExistsResult[0] as any)?.count || 0) > 0;

      if (!columnExists) {
        console.log(
          "[CRM Migration] Adding description column to existing tags table"
        );
        await db.raw(`
          ALTER TABLE tags ADD COLUMN description TEXT
        `);
      }
    }

    // Criar outras tabelas se não existirem
    await db.raw(`
      CREATE TABLE IF NOT EXISTS customer_treatments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        nome_medicamento VARCHAR(255) NOT NULL,
        posologia_diaria INT NOT NULL COMMENT 'Qtd comprimidos/dia',
        qtd_caixa INT NOT NULL COMMENT 'Qtd total na caixa',
        data_ultima_compra DATETIME,
        data_fim_previsto DATETIME COMMENT 'Campo calculado para query performático',
        observacoes TEXT,
        is_active INT DEFAULT 1 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await db.raw(`
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

    // ==============================
    // Enterprise CRM foundation
    // ==============================

    await db.raw(`
      CREATE TABLE IF NOT EXISTS crm_outbox_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_name VARCHAR(120) NOT NULL,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT NULL,
        actor_user_id INT NULL,
        payload_json TEXT NULL,
        idempotency_key VARCHAR(120) NULL,
        status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
        error TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        INDEX idx_outbox_status_created (status, created_at),
        INDEX idx_outbox_entity (entity_type, entity_id),
        INDEX idx_outbox_actor (actor_user_id)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS crm_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(80) NOT NULL,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT NULL,
        actor_user_id INT NULL,
        before_json TEXT NULL,
        after_json TEXT NULL,
        request_id VARCHAR(80) NULL,
        ip VARCHAR(80) NULL,
        user_agent VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_entity (entity_type, entity_id),
        INDEX idx_audit_actor_created (actor_user_id, created_at)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS crm_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT NOT NULL,
        activity_type VARCHAR(40) NOT NULL,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        metadata_json TEXT NULL,
        actor_user_id INT NULL,
        occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity_entity_time (entity_type, entity_id, occurred_at),
        INDEX idx_activity_actor_time (actor_user_id, occurred_at)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS frontend_telemetry_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        page VARCHAR(160) NULL,
        event_name VARCHAR(120) NOT NULL,
        payload_json TEXT NULL,
        occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_telemetry_user_time (user_id, occurred_at),
        INDEX idx_telemetry_event_time (event_name, occurred_at)
      )
    `);

    console.log("[CRM Migration] Tables created successfully");

    // Inserir tags iniciais
    const initialTags = [
      {
        name: "Diabético",
        color: "#ef4444",
        description: "Paciente com diabetes",
      },
      {
        name: "Hipertenso",
        color: "#f97316",
        description: "Paciente com hipertensão arterial",
      },
      {
        name: "Dermo",
        color: "#8b5cf6",
        description: "Produtos dermatológicos",
      },
      { name: "Infantil", color: "#22c55e", description: "Produtos infantil" },
      { name: "Idoso", color: "#64748b", description: "Paciente idoso" },
      { name: "VIP", color: "#eab308", description: "Cliente VIP" },
      { name: "Gestante", color: "#ec4899", description: "Cliente gestante" },
      {
        name: "Oncológico",
        color: "#06b6d4",
        description: "Tratamento oncológico",
      },
    ];

    // Seed initial tags using individual inserts with existence check
    for (const tag of initialTags) {
      try {
        const tagName = (tag.name || "").trim();

        if (!tagName) {
          continue;
        }

        // Check if tag already exists
        const existingResult = await db.raw(
          `SELECT id FROM tags WHERE name = ? LIMIT 1`,
          [tagName]
        );

        // Parse existing result safely
        let tagExists = false;
        if (
          existingResult &&
          Array.isArray(existingResult) &&
          existingResult.length > 0
        ) {
          tagExists = true;
        }

        if (!tagExists) {
          // Insert only if doesn't exist
          await db.raw(
            `INSERT INTO tags (name, color, description) VALUES (?, ?, ?)`,
            [tagName, tag.color, tag.description]
          );
          console.log(`[CRM Migration] Tag "${tagName}" created`);
        } else {
          console.log(
            `[CRM Migration] Tag "${tagName}" already exists, skipping`
          );
        }
      } catch (tagError) {
        console.error(
          `[CRM Migration] Error creating tag "${tag.name}":`,
          tagError
        );
        // Continue with other tags even if one fails
      }
    }

    console.log("[CRM Migration] Tags seeded successfully");
    return true;
  } catch (error) {
    console.error("[CRM Migration] Error:", error);
    return false;
  }
}
