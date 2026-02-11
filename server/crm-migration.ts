import { getDb } from "./db";

export async function runCRMMigration() {
  const db = await getDb();
  if (!db) {
    console.error("[CRM Migration] Database not available");
    return false;
  }

  try {
    console.log("[CRM Migration] Starting...");

    // Verificar se a tabela tags existe e se tem a coluna description
    const [existingTagsTable] = await db.execute(`
      SHOW TABLES LIKE 'tags'
    `);

    console.log("[CRM Migration] Tags table check:", existingTagsTable);

    // Se não existir, criar tabela com a coluna description
    if (!existingTagsTable || existingTagsTable.length === 0) {
      console.log(
        "[CRM Migration] Creating tags table with description column"
      );
      await db.execute(`
        CREATE TABLE tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          color VARCHAR(7) DEFAULT '#6366f1' NOT NULL COMMENT 'Cor em hex',
          description TEXT,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
    } else {
      // Se tabela existe mas não tem description, adicionar a coluna
      console.log("[CRM Migration] Checking if description column exists");
      const [descriptionColumn] = await db.execute(`
        SHOW COLUMNS FROM tags LIKE 'description'
      `);

      if (!descriptionColumn || descriptionColumn.length === 0) {
        console.log(
          "[CRM Migration] Adding description column to existing tags table"
        );
        await db.execute(`
          ALTER TABLE tags ADD COLUMN description TEXT
        `);
      }
    }

    // Criar outras tabelas se não existirem
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

    for (const tag of initialTags) {
      await db.execute(
        `
        INSERT IGNORE INTO tags (name, color, description) VALUES (?, ?, ?)
      `,
        [tag.name, tag.color, tag.description]
      );
    }

    console.log("[CRM Migration] Tags seeded successfully");
    return true;
  } catch (error) {
    console.error("[CRM Migration] Error:", error);
    return false;
  }
}
