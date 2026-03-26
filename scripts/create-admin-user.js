import mysql from "mysql2/promise";

async function createAdminUser() {
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

  // Verificar se já existe
  const [rows] = await connection.execute("SELECT id FROM users WHERE email = ?", ["admin@example.com"]);
  if (rows.length > 0) {
    console.log("Usuário admin@example.com já existe");
  } else {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [result] = await connection.execute(
      `INSERT INTO users (open_id, email, name, role, password_hash, login_method, last_signed_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["admin-001", "admin@example.com", "Administrator", "admin", "hash123", "manual", now, now, now]
    );
    console.log("Usuário admin criado com ID:", result.insertId);
  }

  await connection.end();
}

createAdminUser().catch(console.error);
