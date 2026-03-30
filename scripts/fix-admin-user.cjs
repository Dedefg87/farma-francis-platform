const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixAdminUser() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida");
    process.exit(1);
  }

  const { hostname, username, password, pathname, port } = new URL(url);

  const connection = await mysql.createConnection({
    host: hostname,
    user: username,
    password: password,
    database: pathname.slice(1),
    port: port ? parseInt(port) : 3306,
  });

  console.log("[FixAdmin] Conectado ao banco");

  // Verificar colunas da tabela users
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION"
  );
  const columnNames = Array.isArray(columns) ? columns.map(col => col.COLUMN_NAME) : [];
  console.log("[FixAdmin] Colunas na tabela users:", columnNames);

  // Verificar admin existente
  const [existing] = await connection.execute(
    "SELECT * FROM users WHERE email = ?",
    ["admin@example.com"]
  );
  const rows = Array.isArray(existing) ? existing : [];

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (rows.length > 0) {
    console.log("[FixAdmin] Usuário admin@example.com já existe. Atualizando senha e campos...");
    const hashedPassword = bcrypt.hashSync("123456", 10);
    
    const updateFields = [];
    const values = [];

    if (columnNames.includes("passwordHash")) {
      updateFields.push("passwordHash = ?");
      values.push(hashedPassword);
    } else if (columnNames.includes("password_hash")) {
      updateFields.push("password_hash = ?");
      values.push(hashedPassword);
    } else {
      console.error("[FixAdmin] Nenhum campo de senha encontrado!");
      process.exit(1);
    }

    if (columnNames.includes("lastSignedIn")) {
      updateFields.push("lastSignedIn = ?");
      values.push(now);
    } else if (columnNames.includes("last_signed_in")) {
      updateFields.push("last_signed_in = ?");
      values.push(now);
    }

    if (columnNames.includes("updatedAt")) {
      updateFields.push("updatedAt = ?");
      values.push(now);
    } else if (columnNames.includes("updated_at")) {
      updateFields.push("updated_at = ?");
      values.push(now);
    }

    values.push("admin@example.com");
    await connection.execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE email = ?`,
      values
    );
    console.log("[FixAdmin] Senha e campos atualizados.");
  } else {
    console.log("[FixAdmin] Criando novo admin@example.com...");
    const hashedPassword = bcrypt.hashSync("123456", 10);

    const cols = [];
    const vals = [];

    // openId
    if (columnNames.includes("openId")) {
      cols.push("openId");
      vals.push("admin-001");
    } else if (columnNames.includes("open_id")) {
      cols.push("open_id");
      vals.push("admin-001");
    }

    if (columnNames.includes("email")) {
      cols.push("email");
      vals.push("admin@example.com");
    }

    if (columnNames.includes("name")) {
      cols.push("name");
      vals.push("Administrator");
    }

    if (columnNames.includes("role")) {
      cols.push("role");
      vals.push("admin");
    }

    if (columnNames.includes("passwordHash")) {
      cols.push("passwordHash");
      vals.push(hashedPassword);
    } else if (columnNames.includes("password_hash")) {
      cols.push("password_hash");
      vals.push(hashedPassword);
    }

    if (columnNames.includes("loginMethod")) {
      cols.push("loginMethod");
      vals.push("manual");
    } else if (columnNames.includes("login_method")) {
      cols.push("login_method");
      vals.push("manual");
    }

    if (columnNames.includes("createdAt")) {
      cols.push("createdAt");
      vals.push(now);
    } else if (columnNames.includes("created_at")) {
      cols.push("created_at");
      vals.push(now);
    }

    if (columnNames.includes("updatedAt")) {
      cols.push("updatedAt");
      vals.push(now);
    } else if (columnNames.includes("updated_at")) {
      cols.push("updated_at");
      vals.push(now);
    }

    if (columnNames.includes("lastSignedIn")) {
      cols.push("lastSignedIn");
      vals.push(now);
    } else if (columnNames.includes("last_signed_in")) {
      cols.push("last_signed_in");
      vals.push(now);
    }

    const sql = `INSERT INTO users (${cols.join(", ")}) VALUES (${vals.map(() => "?").join(", ")})`;
    await connection.execute(sql, vals);
    console.log("[FixAdmin] Admin criado com sucesso!");
  }

  await connection.end();
  console.log("[FixAdmin] Conexão encerrada");
}

fixAdminUser().catch(err => {
  console.error("[FixAdmin] Erro:", err);
  process.exit(1);
});
