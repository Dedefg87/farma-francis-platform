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

    // ==============================
    // Accounts / Deals / Tasks / Custom Fields
    // ==============================

    await db.raw(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255) NULL,
        cnpj VARCHAR(18) NULL,
        industry VARCHAR(120) NULL,
        website VARCHAR(255) NULL,
        phone VARCHAR(20) NULL,
        address TEXT NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(2) NULL,
        zip_code VARCHAR(10) NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        owner_user_id INT NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_accounts_name (name),
        INDEX idx_accounts_cnpj (cnpj),
        INDEX idx_accounts_owner (owner_user_id)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS account_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        customer_id INT NOT NULL,
        role VARCHAR(120) NULL,
        is_primary INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_account_customer (account_id, customer_id),
        INDEX idx_account_contacts_account (account_id),
        INDEX idx_account_contacts_customer (customer_id),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS deal_pipelines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        is_active INT NOT NULL DEFAULT 1,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pipeline_active (is_active)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS deal_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pipeline_id INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        probability INT NOT NULL DEFAULT 0,
        is_won INT NOT NULL DEFAULT 0,
        is_lost INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stage_pipeline_order (pipeline_id, sort_order),
        FOREIGN KEY (pipeline_id) REFERENCES deal_pipelines(id) ON DELETE CASCADE
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NULL,
        customer_id INT NULL,
        pipeline_id INT NOT NULL,
        stage_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount_cents INT NULL,
        currency VARCHAR(3) NULL DEFAULT 'BRL',
        close_date DATETIME NULL,
        status ENUM('open','won','lost') NOT NULL DEFAULT 'open',
        owner_user_id INT NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_deals_pipeline_stage (pipeline_id, stage_id),
        INDEX idx_deals_owner_status (owner_user_id, status),
        INDEX idx_deals_account (account_id),
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (pipeline_id) REFERENCES deal_pipelines(id),
        FOREIGN KEY (stage_id) REFERENCES deal_stages(id)
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS crm_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        due_at DATETIME NULL,
        status ENUM('open','done','cancelled') NOT NULL DEFAULT 'open',
        priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
        related_entity_type VARCHAR(40) NULL,
        related_entity_id INT NULL,
        assigned_to INT NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        INDEX idx_tasks_assigned_status_due (assigned_to, status, due_at),
        INDEX idx_tasks_related (related_entity_type, related_entity_id)
      )
    `);

    await db.raw(
      `
      CREATE TABLE IF NOT EXISTS custom_field_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        ` +
        "`key`" +
        ` VARCHAR(80) NOT NULL,
        label VARCHAR(120) NOT NULL,
        field_type ENUM('text','number','date','boolean','select') NOT NULL,
        options_json TEXT NULL,
        is_required INT NOT NULL DEFAULT 0,
        is_active INT NOT NULL DEFAULT 1,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_field_def (entity_type, ` +
        "`key`" +
        `),
        INDEX idx_field_def_entity (entity_type, is_active)
      )
    `
    );

    await db.raw(`
      CREATE TABLE IF NOT EXISTS custom_field_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT NOT NULL,
        field_definition_id INT NOT NULL,
        value_text TEXT NULL,
        updated_by INT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_field_value (entity_type, entity_id, field_definition_id),
        INDEX idx_field_value_entity (entity_type, entity_id),
        FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE
      )
    `);

    // Seed a default pipeline + stages (idempotent)
    try {
      const existingP = await db.raw(
        `SELECT id FROM deal_pipelines WHERE name = ? LIMIT 1`,
        ["Vendas"]
      );
      let pipelineId: number | null = null;
      if (Array.isArray(existingP) && existingP[0]?.id) {
        pipelineId = Number((existingP[0] as any).id);
      }
      if (!pipelineId) {
        await db.raw(
          `INSERT INTO deal_pipelines (name, is_active) VALUES (?, 1)`,
          ["Vendas"]
        );
        const p2 = await db.raw(
          `SELECT id FROM deal_pipelines WHERE name = ? LIMIT 1`,
          ["Vendas"]
        );
        pipelineId =
          Array.isArray(p2) && p2[0]?.id ? Number((p2[0] as any).id) : null;
      }

      if (pipelineId) {
        const stages = [
          { name: "Prospeccao", sort: 10, prob: 10 },
          { name: "Qualificacao", sort: 20, prob: 30 },
          { name: "Proposta", sort: 30, prob: 60 },
          { name: "Negociacao", sort: 40, prob: 80 },
          { name: "Ganho", sort: 90, prob: 100, won: 1 },
          { name: "Perdido", sort: 99, prob: 0, lost: 1 },
        ];

        for (const s of stages) {
          const ex = await db.raw(
            `SELECT id FROM deal_stages WHERE pipeline_id = ? AND name = ? LIMIT 1`,
            [pipelineId, s.name]
          );
          const exists = Array.isArray(ex) && ex.length > 0;
          if (!exists) {
            await db.raw(
              `INSERT INTO deal_stages (pipeline_id, name, sort_order, probability, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                pipelineId,
                s.name,
                s.sort,
                s.prob,
                (s as any).won || 0,
                (s as any).lost || 0,
              ]
            );
          }
        }
      }
    } catch (e) {
      console.log(
        "[CRM Migration] Pipeline seed skipped:",
        (e as any)?.message || e
      );
    }

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
